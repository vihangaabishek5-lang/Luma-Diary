'use strict';
const {app,BrowserWindow,ipcMain,dialog,Notification,Tray,Menu,nativeImage,shell} = require('electron');
const path=require('node:path');
const fs=require('node:fs');
const crypto=require('node:crypto');
const vault=require('./vault');
const drive=require('./drive');
const legacy=require('./legacy-native');
const config=require('./app-config.json');
let win, unlockedKey=null, diary=null, salt=null, autosyncTimer=null, inSync=false;
let lastReminderSweep=0;
const vaultPath=()=>path.join(app.getPath('userData'),'vault.json');
const legacyNativePaths=()=>[process.env.APPDATA,process.env.LOCALAPPDATA].filter(Boolean).map(dir=>path.join(dir,'LumaDiaryPortable','vault.json'));
const nativeVaultPath=()=>legacyNativePaths().find(file=>fs.existsSync(file));
const status=()=>({exists:fs.existsSync(vaultPath()),hasLegacy:!!nativeVaultPath(),unlocked:!!unlockedKey,version:app.getVersion(),hasDrive:!!diary?.settings?.driveAuth,clientId:diary?.settings?.driveAuth?.clientId || config.googleClientId || '',githubRepo:config.githubRepo||''});
function validateDiary(input) {
  if (!input || !Array.isArray(input.entries) || input.entries.length>40000 || !input.settings || typeof input.settings!=='object') throw Error('The diary backup is not supported.');
  for (const e of input.entries) {
    if (!e || typeof e.id!=='string' || e.id.length>80 || typeof e.title!=='string' || typeof e.body!=='string' ||
        e.body.length>300000 || e.title.length>300 || typeof e.updatedAt!=='string') throw Error('Invalid entry in the backup.');
  }
  return input;
}
function requireUnlocked() { if (!unlockedKey || !diary) throw Error('Unlock your diary first.'); }
function saveVault() {
  requireUnlocked();
  const encrypted=vault.encrypt(diary,unlockedKey,salt);
  vault.writeAtomic(vaultPath(),encrypted);
  // Daily encrypted snapshots: last 7 days only. No plaintext on disk.
  try{
    const dir=path.join(app.getPath('userData'),'Backups');
    fs.mkdirSync(dir,{recursive:true});
    const file=path.join(dir,'Luma-'+new Date().toISOString().slice(0,10)+'.json');
    vault.writeAtomic(file,encrypted);
    const backups=fs.readdirSync(dir).filter(x=>/^Luma-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort();
    for(const stale of backups.slice(0,Math.max(0,backups.length-7)))fs.unlinkSync(path.join(dir,stale));
  }catch(e){console.error('Local backup snapshot failed:',e.message);}
}
function publicDiary() {
  requireUnlocked();
  const settings={...diary.settings}; delete settings.driveAuth;
  return {entries:diary.entries,settings,hasDrive:!!diary.settings.driveAuth,version:app.getVersion(),googleClientId:diary.settings.driveAuth?.clientId || config.googleClientId || '',githubRepo:config.githubRepo};
}
function announce(kind,message) {
  if (win && !win.isDestroyed()) win.webContents.send('sync-status',{kind,message,at:new Date().toISOString()});
}
function queuedSync() {
  if (!diary?.settings?.autoSync || !diary?.settings?.driveAuth || !unlockedKey) return;
  clearTimeout(autosyncTimer);
  autosyncTimer=setTimeout(()=>syncCloud(false).catch(e=>announce('error',`Auto sync: ${e.message}`)),45000);
}
function initVault(passphrase) {
  if (fs.existsSync(vaultPath())) throw Error('A diary already exists. Please unlock it.');
  salt=vault.createSalt(); unlockedKey=vault.keyFromPassword(passphrase,salt);
  diary=vault.defaultData(); saveVault(); return publicDiary();
}
function unlockVault(passphrase) {
  const envelope=vault.readEnvelope(vaultPath());
  const k=vault.keyFromPassword(passphrase,envelope.salt);
  const data=validateDiary(vault.decrypt(envelope,k));
  salt=envelope.salt; unlockedKey=k; diary=data;
  sweepReminders(); queuedSync();
  return publicDiary();
}
function lockVault() {
  clearTimeout(autosyncTimer);
  if (unlockedKey) unlockedKey.fill(0);
  unlockedKey=null;diary=null;salt=null;
}
function validText(value, max=1000) { return typeof value==='string' && value.length<=max; }
function safeEntry(raw) {
  if (!raw || typeof raw!=='object' || !validText(raw.title,200) || !validText(raw.body,300000) ||
    !validText(raw.mood,32) || !validText(raw.tags,240) || !validText(raw.remindAt,40)) throw Error('Entry is invalid or too long.');
  if (raw.remindAt && !Number.isFinite(new Date(raw.remindAt).getTime())) throw Error('Invalid reminder date.');
  const existing=raw.id && diary.entries.find(e=>e.id===raw.id && !e.deletedAt);
  const now=new Date().toISOString();
  return {
    id: existing?.id || crypto.randomUUID(),
    title: raw.title.trim()||'Untitled thought', body: raw.body,
    mood: raw.mood || 'calm',tags:raw.tags||'',
    remindAt:raw.remindAt||'', entryDate:/^\d{4}-\d{2}-\d{2}$/.test(raw.entryDate||'')?raw.entryDate:(existing?.entryDate||now.slice(0,10)), pinned:!!raw.pinned,
    createdAt:existing?.createdAt||now,updatedAt:now,
    remindedAt:existing?.remindAt===raw.remindAt ? (existing.remindedAt||null) : null
  };
}
function sweepReminders() {
  if (!unlockedKey || !diary?.settings?.notifications || !Notification.isSupported()) return;
  const now=Date.now(); if(now-lastReminderSweep<5000) return;lastReminderSweep=now;
  let changed=false;
  for (const entry of diary.entries) {
    if (entry.deletedAt || !entry.remindAt || entry.remindedAt) continue;
    const due=new Date(entry.remindAt).getTime();
    if(Number.isFinite(due) && due<=now && now-due < 24*60*60*1000) {
      // Never reveal diary content in Windows notification previews.
      const notification=new Notification({title:'Luma Diary',body:'You have a private diary reminder.',silent:false});
      notification.on('click',()=>{ if(win){win.show();win.focus();} });
      notification.show();
      entry.remindedAt=new Date().toISOString();changed=true;
    }
  }
  if(changed) {saveVault();queuedSync();}
}
function sanitizedCloudPayload() {
  return vault.encrypt(vault.cloudData(diary),unlockedKey,salt);
}
async function syncCloud(manual) {
  requireUnlocked();
  if(inSync) return {message:'A Google Drive sync is already running.'};
  if(!diary.settings.driveAuth) throw Error('Connect Google Drive in Settings first.');
  inSync=true;
  announce('working','Syncing encrypted diary with Google Drive…');
  try {
    const token=await drive.accessToken(diary.settings.driveAuth);
    const remote=await drive.locate(token);
    if(remote) {
      const remoteEnvelope=await drive.download(token,remote.id);
      vault.assertEnvelope(remoteEnvelope);
      if(remoteEnvelope.salt!==salt) throw Error('This cloud diary uses a different encryption key. Use “Restore from Drive” with its passphrase before syncing.');
      const remoteData=validateDiary(vault.decrypt(remoteEnvelope,unlockedKey));
      diary.entries=vault.mergeEntries(diary.entries,remoteData.entries);
    }
    await drive.upload(token,remote,sanitizedCloudPayload());
    diary.settings.cloudLastSync=new Date().toISOString();
    saveVault();
    announce('success','Encrypted Google Drive sync complete.');
    return {message:'Encrypted Google Drive sync complete.',count:diary.entries.filter(e=>!e.deletedAt).length};
  } catch(e) {announce('error',e.message);throw e;}
  finally {inSync=false;}
}
function guardOverwriteBackup() {
  if (!fs.existsSync(vaultPath())) return;
  const dest=path.join(app.getPath('userData'),`vault-before-restore-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  fs.copyFileSync(vaultPath(),dest);
}
function replaceWithEnvelope(envelope, passphrase, preserveDrive=true) {
  vault.assertEnvelope(envelope);
  const newKey=vault.keyFromPassword(passphrase,envelope.salt);
  const newData=validateDiary(vault.decrypt(envelope,newKey));
  if(preserveDrive && diary?.settings.driveAuth) newData.settings.driveAuth=diary.settings.driveAuth;
  guardOverwriteBackup();
  const previousKey=unlockedKey;
  salt=envelope.salt;unlockedKey=newKey;diary=newData;
  saveVault();
  if(previousKey) previousKey.fill(0);
  return publicDiary();
}
function startWindow() {
  win=new BrowserWindow({
    width:1300,height:850,minWidth:900,minHeight:650,
    title:'Luma Diary',show:false,backgroundColor:'#edf4fc',
    icon:path.join(__dirname,'../assets/icon.png'),
    autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}
  });
  win.loadFile(path.join(__dirname,'renderer/index.html'));
  win.once('ready-to-show',()=>win.show());

  win.webContents.setWindowOpenHandler(({url})=>{
    if(url.startsWith('https://')) shell.openExternal(url);return {action:'deny'};
  });
  win.webContents.on('will-navigate',(event)=>event.preventDefault());
}
app.whenReady().then(()=>{
  app.setAppUserModelId('app.lumadiary.desktop');
  app.on('web-contents-created',(_event,content)=>{
    content.on('will-attach-webview',(e)=>e.preventDefault());
  });
  startWindow();
  setInterval(sweepReminders,30000);
  setInterval(()=>{if(unlockedKey && diary?.settings?.autoSync && diary?.settings?.driveAuth &&
    (!diary.settings.cloudLastSync || Date.now()-new Date(diary.settings.cloudLastSync).getTime()>30*60*1000)) {
      syncCloud(false).catch(e=>announce('error',`Auto sync: ${e.message}`));
    }},5*60*1000);
  app.on('activate',()=>{if(win)win.show();});
});
app.on('before-quit',()=>{lockVault();});
app.on('window-all-closed',()=>app.quit());
const handlers={
  status:()=>status(),
  'import-native':({passphrase})=>{
    if(fs.existsSync(vaultPath()))throw Error('A Luma diary already exists. Export a backup before importing.');
    const oldPath=nativeVaultPath();
    if(!oldPath)throw Error('No Native v1.1 diary was found.');
    const imported=validateDiary(legacy.decryptLegacyFile(oldPath,passphrase));
    const cleanSettings={...vault.defaultData().settings,...imported.settings,driveAuth:null,cloudLastSync:null};
    // Old Drive credentials are intentionally not reused; re-connect to sync the new format.
    salt=vault.createSalt();unlockedKey=vault.keyFromPassword(passphrase,salt);
    diary={entries:imported.entries,settings:cleanSettings,createdAt:imported.createdAt||new Date().toISOString()};
    saveVault();return publicDiary();
  },
  setup:({passphrase})=>initVault(passphrase),
  unlock:({passphrase})=>unlockVault(passphrase),
  lock:()=>{lockVault();return status();},
  load:()=>publicDiary(),
  'save-entry':(item)=>{
    requireUnlocked();const entry=safeEntry(item);
    const idx=diary.entries.findIndex(e=>e.id===entry.id);
    if(idx>=0)diary.entries[idx]=entry;else diary.entries.push(entry);
    saveVault();queuedSync();return publicDiary();
  },
  'delete-entry':({id})=>{
    requireUnlocked();const entry=diary.entries.find(e=>e.id===id && !e.deletedAt);
    if(!entry)throw Error('Entry not found.');
    entry.deletedAt=new Date().toISOString();entry.updatedAt=entry.deletedAt;
    // Keep a minimal tombstone for cross-device deletion, not the deleted diary text.
    entry.title='';entry.body='';entry.tags='';entry.remindAt='';entry.remindedAt=null;entry.pinned=false;
    saveVault();queuedSync();return publicDiary();
  },
  'save-settings':(settings)=>{
    requireUnlocked();if(!settings || typeof settings!=='object')throw Error('Invalid settings.');
    if (typeof settings.theme==='string' && ['ocean','violet','rose','forest','sunset','midnight','custom'].includes(settings.theme)) diary.settings.theme=settings.theme;
    if(typeof settings.accent==='string' && /^#[a-fA-F0-9]{6}$/.test(settings.accent)) diary.settings.accent=settings.accent;
    if(typeof settings.displayName==='string' && settings.displayName.length<=50) diary.settings.displayName=settings.displayName.trim();
    for(const key of ['autoSync','notifications']) if(typeof settings[key]==='boolean') diary.settings[key]=settings[key];
    saveVault();if(settings.autoSync===true)queuedSync();return publicDiary();
  },
  'drive-connect':async ({clientId})=>{
    requireUnlocked();
    const auth=await drive.authorize(clientId||config.googleClientId,url=>shell.openExternal(url));
    diary.settings.driveAuth=auth;saveVault();
    return publicDiary();
  },
  'drive-disconnect':()=>{requireUnlocked();diary.settings.driveAuth=null;saveVault();return publicDiary();},
  'drive-sync':async()=>{await syncCloud(true);return publicDiary();},
  'drive-restore':async({passphrase})=>{
    requireUnlocked();if(!diary.settings.driveAuth)throw Error('Connect your Google Drive first.');
    if(inSync) throw Error('Sync is still running.');
    const token=await drive.accessToken(diary.settings.driveAuth);
    const remote=await drive.locate(token);
    if(!remote)throw Error('No Luma Diary backup found in Google Drive.');
    const envelope=await drive.download(token,remote.id);
    const result=replaceWithEnvelope(envelope,passphrase,true);
    announce('success','Cloud diary restored. Previous local vault was preserved in app data.');return result;
  },
  'local-export':async()=>{
    requireUnlocked();
    const {canceled,filePath}=await dialog.showSaveDialog(win,{title:'Export encrypted diary backup',
      defaultPath:`Luma-Diary-Backup-${new Date().toISOString().slice(0,10)}.json`,filters:[{name:'Encrypted Diary Backup',extensions:['json']}]});
    if(canceled||!filePath)return {cancelled:true};
    vault.writeAtomic(filePath,sanitizedCloudPayload());return {filePath};
  },
  'local-import':async({passphrase})=>{
    requireUnlocked();
    const {canceled,filePaths}=await dialog.showOpenDialog(win,{title:'Restore an encrypted Luma Diary backup',properties:['openFile'],filters:[{name:'Encrypted Diary Backup',extensions:['json']}]});
    if(canceled||!filePaths.length)return {cancelled:true};
    const envelope=vault.readEnvelope(filePaths[0]);return replaceWithEnvelope(envelope,passphrase,true);
  },
  'check-updates':async()=>{
    const repo=config.githubRepo;
    if(!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)) return {configured:false,version:app.getVersion()};
    const resp=await fetch(`https://api.github.com/repos/${repo}/releases/latest`,{
      headers:{'Accept':'application/vnd.github+json','User-Agent':'Luma-Diary'},signal:AbortSignal.timeout(15000)});
    if(!resp.ok)throw Error('Could not check GitHub releases.');
    const release=await resp.json();
    const latest=String(release.tag_name||'').replace(/^v/,'');
    const parse=v=>v.split('.').map(n=>Number.parseInt(n,10)||0);
    const curr=parse(app.getVersion()),next=parse(latest);
    const newer=next[0]>curr[0] || (next[0]===curr[0]&&next[1]>curr[1]) || (next[0]===curr[0]&&next[1]===curr[1]&&next[2]>curr[2]);
    return {configured:true,latest,current:app.getVersion(),newer,url:`https://github.com/${repo}/releases/latest`};
  },
  'open-url':async({url})=>{
    if(typeof url!=='string' || !/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/releases(\/latest)?$/.test(url)) throw Error('Invalid GitHub link.');
    await shell.openExternal(url);return true;
  }
};
for(const [name,fn] of Object.entries(handlers)) {
  ipcMain.handle(name,async(_event,args)=>{
    try{return await fn(args||{});}catch(error){throw Error(error?.message||'Something went wrong.');}
  });
}
