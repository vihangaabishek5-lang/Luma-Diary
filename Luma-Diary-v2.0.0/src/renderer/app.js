'use strict';
const $=id=>document.getElementById(id);
const state={data:null,view:'home',selected:null,editorInitial:'',calendar:new Date(),calDate:null,toastTimer:null,gateMode:'unlock',pendingRestore:false};
const moods={happy:'☺ Happy',calm:'☁ Calm',grateful:'♡ Grateful',sad:'☂ Reflective',excited:'✦ Excited'};
function notify(message,isError=false){
  const el=$('toast');el.textContent=message;el.classList.toggle('error',isError);el.classList.add('show');
  clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('show'),4600);
}
async function request(channel,arg){try{return await window.luma.call(channel,arg);}catch(e){notify(e.message||'An unexpected error occurred.',true);throw e;}}
const allEntries=()=>state.data?.entries.filter(e=>!e.deletedAt)||[];
const entryDay=e=>e.entryDate||localDay(e.createdAt);
const prompts=['What small thing made you smile today?','What are you grateful for right now?','If today had a color, what would it be?','Write down one thing you want to remember.','What did you learn about yourself today?'];
const dateString=d=>new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const localDay=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;};
function dayStreak(entries){
  const set=new Set(entries.map(entryDay));
  let d=new Date();d.setHours(12,0,0,0);
  if(!set.has(localDay(d)))d.setDate(d.getDate()-1);
  let count=0;while(set.has(localDay(d))){count++;d.setDate(d.getDate()-1);}return count;
}
function applyTheme(){
  const settings=state.data.settings;
  document.body.dataset.theme=settings.theme||'ocean';
  document.body.style.setProperty('--user-accent',settings.accent||'#367bf6');
  $('accent-input').value=settings.accent||'#367bf6';
  document.querySelectorAll('.theme-swatch').forEach(b=>b.classList.toggle('selected',b.dataset.themeChoice===settings.theme));
}
function displayApp(data){
  state.data=data;
  $('gate').classList.add('hidden');$('shell').classList.remove('hidden');
  $('auto-sync').checked=data.settings.autoSync!==false;
  $('notifications').checked=data.settings.notifications!==false;
  $('oauth-id').value=data.googleClientId||'';
  $('drive-connect').textContent=data.hasDrive?'Reconnect Google Drive':'Connect Google Drive';
  $('drive-disconnect').classList.toggle('hidden',!data.hasDrive);
  $('version-text').textContent=`Installed version ${data.version}`;
  $('display-name').value=data.settings.displayName||'';
  applyTheme();render();switchView(state.pendingRestore?'backups':state.view);
  if(state.pendingRestore){state.pendingRestore=false;notify('To restore an encrypted backup, choose Import encrypted backup below.');}
}
function gate(exists){
  state.gateMode=exists?'unlock':'setup';
  $('gate').classList.remove('hidden');$('shell').classList.add('hidden');
  $('gate-landing').classList.remove('hidden');$('gate-auth').classList.add('hidden');
  $('welcome-heading').innerHTML=exists?'Welcome back to<br><span>Luma Diary.</span>':'Welcome to<br><span>Luma Diary.</span>';
  $('welcome-description').textContent=exists?'Your private memories are waiting. Pick up where you left off.':'A beautiful space for your thoughts, memories, and everyday moments.';
  $('gate-start').textContent=exists?'Unlock My Diary →':'Get Started →';
  $('gate-import-start').textContent=exists?'Restore / import backup':'Import existing diary';
  $('auth-heading').textContent=exists?'Unlock your private space':'Create your private space';
  $('confirm-wrap').classList.toggle('hidden',exists);
  $('setup-warning').classList.toggle('hidden',exists);
  $('confirm-pass').required=!exists;
  $('gate-description').textContent=exists?'Welcome home. Enter your passphrase to see your memories.':'Choose a strong passphrase to keep your memories private.';
  $('gate-submit').textContent=exists?'Unlock diary →':'Create my diary →';
  $('passphrase').value='';$('confirm-pass').value='';
  $('legacy-import').classList.add('hidden');
}
function showGateAuth(importRequested=false){
  if(importRequested && state.gateMode==='setup')state.pendingRestore=true;
  $('gate-landing').classList.add('hidden');$('gate-auth').classList.remove('hidden');$('passphrase').focus();
}
function switchView(view){
  state.view=view;
  for(const el of document.querySelectorAll('.view'))el.classList.toggle('hidden',el.id!==`view-${view}`);
  document.querySelectorAll('.nav-button').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  const labels={home:'Home',journal:'Journal',calendar:'Calendar',explore:'Explore',reminders:'Reminders',insights:'Insights',backups:'Backup & Sync',settings:'Settings'};
  $('breadcrumb').textContent=labels[view];
  if(view==='home')renderHome();if(view==='calendar')renderCalendar();if(view==='insights')renderInsights();if(view==='backups')renderBackups();if(view==='reminders')renderReminders();if(view==='explore')renderExplore();
}
function render(){
  const entries=allEntries();
  $('stat-entries').textContent=entries.length;
  $('stat-days').textContent=new Set(entries.map(entryDay)).size;
  $('stat-streak').textContent=dayStreak(entries);
  $('entry-count').textContent=entries.length;
  const date=new Date();
  $('top-date').textContent=date.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
  const hour=date.getHours();
  $('greeting').textContent=(hour<12?'Good morning':hour<17?'Good afternoon':'Good evening')+', beautiful soul.';
  $('sidebar-sync').textContent=state.data.hasDrive?'Google Drive connected':'Stored safely on this PC';
  renderEntries();renderHome();renderBackups();if(state.view==='calendar')renderCalendar();if(state.view==='insights')renderInsights();
}
function entryCard(entry){
  const b=document.createElement('button');b.className='entry-card';b.type='button';b.title='Open diary entry';
  const head=document.createElement('div');head.className='entry-card-head';
  const date=document.createElement('span');date.className='entry-date';date.textContent=new Date(entryDay(entry)+'T12:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  const mood=document.createElement('span');mood.className='entry-mood';mood.textContent=moods[entry.mood]||'☁ Calm';
  head.append(date,mood);
  const title=document.createElement('h3');title.textContent=entry.title;
  const body=document.createElement('p');body.textContent=entry.body;
  const footer=document.createElement('div');footer.className='entry-footer';
  const words=entry.body.trim()?entry.body.trim().split(/\s+/u).length:0;
  footer.textContent=`${words} words`;
  if(entry.tags){const tags=document.createElement('span');tags.textContent=`    #${entry.tags.split(',')[0].trim()}`;footer.append(tags);}
  b.append(head,title,body,footer);b.addEventListener('click',()=>openEditor(entry));return b;
}
function renderEntries(){
  const term=$('search').value.toLowerCase().trim(), mood=$('mood-filter').value;
  const entries=allEntries().filter(e=>
    (mood==='all'||e.mood===mood)&&(!term||[e.title,e.body,e.tags].some(x=>String(x||'').toLowerCase().includes(term))))
    .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(b.entryDate||b.createdAt).localeCompare(a.entryDate||a.createdAt));
  $('entries-grid').replaceChildren(...entries.map(entryCard));
  $('empty-entries').classList.toggle('hidden',entries.length>0);
  $('empty-entries').querySelector('h3').textContent=allEntries().length===0?'A fresh page awaits.':'No memories found.';
  $('empty-entries').querySelector('p').textContent=allEntries().length===0?'Every beautiful story starts with a single thought. Write yours.':'Try a different search or mood filter.';
  $('empty-new').classList.toggle('hidden',allEntries().length!==0);
}

function renderHome(){
  if(!state.data)return;
  const list=allEntries(), now=new Date(), h=now.getHours();
  const greeting=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
  $('home-greeting').textContent=state.data.settings.displayName?`${greeting}, ${state.data.settings.displayName} ✦`:`${greeting}.`;
  $('home-date').textContent=now.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
  $('home-entries').textContent=list.length;
  $('home-days').textContent=new Set(list.map(entryDay)).size;
  $('home-streak').textContent=`${dayStreak(list)} days`;
  renderHomeMiniCalendar();renderHomeStreak();
  const recent=[...list].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,3);
  const container=$('home-recent');container.replaceChildren();
  recent.forEach(entry=>{
    const card=entryCard(entry);card.classList.add('home-entry');container.append(card);
  });
  $('home-empty').classList.toggle('hidden',recent.length!==0);
  const index=(now.getFullYear()*366+Math.floor((now-new Date(now.getFullYear(),0,1))/(24*3600000)))%prompts.length;
  $('home-prompt').textContent=prompts[index];
  const md=localDay(now).slice(5);
  const previous=list.filter(e=>entryDay(e).slice(5)===md && entryDay(e).slice(0,4)!==String(now.getFullYear()));
  const onThis=$('home-on-this-day');onThis.replaceChildren();
  if(previous.length){for(const entry of previous.slice(0,2)){const b=document.createElement('button');b.type='button';b.className='mini-memory';b.textContent=entry.title+'  →';b.addEventListener('click',()=>openEditor(entry));onThis.append(b);}}
  else onThis.textContent='Your memories from this date will appear here next year.';
  const upcoming=list.filter(e=>e.remindAt && !e.remindedAt && new Date(e.remindAt).getTime()>=Date.now()).sort((a,b)=>a.remindAt.localeCompare(b.remindAt)).slice(0,2);
  const reminders=$('home-reminders');reminders.replaceChildren();
  if(!upcoming.length)reminders.textContent='No reminders yet. Add one while writing your next entry.';
  else upcoming.forEach(e=>{const line=document.createElement('button');line.type='button';line.className='mini-memory';line.textContent=`◯ ${e.title} · ${new Date(e.remindAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}`;line.addEventListener('click',()=>openEditor(e));reminders.append(line);});
}

function renderHomeMiniCalendar(){
  const now=new Date();const year=now.getFullYear(),month=now.getMonth();
  $('home-calendar-head').textContent=now.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const grid=$('home-calendar-grid');grid.replaceChildren();
  for(const weekday of ['Su','Mo','Tu','We','Th','Fr','Sa']){const n=document.createElement('div');n.className='mini-weekday';n.textContent=weekday;grid.append(n);}
  const start=new Date(year,month,1).getDay();const last=new Date(year,month+1,0).getDate();
  for(let i=0;i<start;i++){const blank=document.createElement('span');blank.className='mini-day muted';blank.textContent='';grid.append(blank);}
  const dates=new Set(allEntries().map(entryDay));
  for(let day=1;day<=last;day++){
    const date=localDay(new Date(year,month,day,12)),button=document.createElement('button');
    button.type='button';button.className='mini-day';button.textContent=String(day);
    if(day===now.getDate())button.classList.add('today');if(dates.has(date))button.classList.add('has-entry');
    button.title=`View ${date} in calendar`;
    button.addEventListener('click',()=>{state.calendar=new Date(year,month,1);state.calDate=date;switchView('calendar');});grid.append(button);
  }
}
function renderHomeStreak(){
  const days=new Set(allEntries().map(entryDay));const container=$('streak-week');container.replaceChildren();
  const today=new Date(),mon=new Date(today);mon.setDate(today.getDate()-((today.getDay()+6)%7));mon.setHours(12,0,0,0);
  for(let i=0;i<7;i++){
    const d=new Date(mon);d.setDate(mon.getDate()+i);
    const item=document.createElement('div');item.className='streak-item';const bubble=document.createElement('span');bubble.className='streak-bubble';
    if(days.has(localDay(d))){bubble.classList.add('done');bubble.textContent='✓';}else bubble.textContent='·';
    const label=document.createElement('span');label.textContent=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i];item.append(bubble,label);container.append(item);
  }
}
function renderExplore(){
  const today=localDay(new Date());const past=allEntries().filter(e=>entryDay(e).slice(5)===today.slice(5)&&entryDay(e).slice(0,4)!==today.slice(0,4));
  const list=$('explore-memories');list.replaceChildren();
  if(past.length){for(const e of past){const b=document.createElement('button');b.type='button';b.className='mini-memory';b.textContent=`${e.title} — ${entryDay(e)}`;b.addEventListener('click',()=>openEditor(e));list.append(b);}}
  else list.textContent='As your diary grows, special memories will appear here.';
  $('explore-prompt').textContent=$('home-prompt').textContent;
}
function renderReminders(){
  const next=allEntries().filter(e=>e.remindAt&&!e.remindedAt).sort((a,b)=>a.remindAt.localeCompare(b.remindAt));
  const container=$('reminders-list');container.replaceChildren();
  if(!next.length){const el=document.createElement('div');el.className='reminder-empty';el.textContent='No pending reminders. Open a diary entry and choose a reminder date to add one.';container.append(el);return;}
  for(const entry of next){const button=document.createElement('button');button.type='button';button.className='reminder-row';
    const label=document.createElement('span');label.textContent=`◯  ${entry.title}`;const date=document.createElement('small');date.textContent=new Date(entry.remindAt).toLocaleString();button.append(label,date);
    button.addEventListener('click',()=>openEditor(entry));container.append(button);}
}
function renderCalendar(){
  const d=state.calendar,year=d.getFullYear(),month=d.getMonth();
  $('calendar-month').textContent=d.toLocaleDateString(undefined,{year:'numeric',month:'long'});
  const grid=$('calendar-grid');grid.replaceChildren();
  for(const day of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']){
    const el=document.createElement('div');el.className='weekday';el.textContent=day;grid.append(el);
  }
  const offset=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
  for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.className='calendar-day blank';grid.append(blank);}
  const count={};allEntries().forEach(e=>{const key=entryDay(e);count[key]=(count[key]||0)+1;});
  for(let n=1;n<=days;n++){
    const key=localDay(new Date(year,month,n,12));
    const el=document.createElement('button');el.type='button';el.className='calendar-day';el.textContent=String(n);
    if(key===localDay(new Date()))el.classList.add('today');
    if(key===state.calDate)el.classList.add('selected');
    const dots=document.createElement('span');dots.className='day-dots';
    for(let i=0;i<Math.min(count[key]||0,3);i++)dots.append(document.createElement('i'));
    el.append(dots);
    el.addEventListener('click',()=>{state.calDate=key;renderCalendar();});grid.append(el);
  }
  $('calendar-selection').replaceChildren(...allEntries().filter(e=>entryDay(e)===state.calDate).map(entryCard));
}
function renderInsights(){
  const entries=allEntries();
  $('insight-words').textContent=entries.reduce((n,e)=>n+(e.body.trim()?e.body.trim().split(/\s+/u).length:0),0).toLocaleString();
  const now=new Date();$('insight-month').textContent=entries.filter(e=>{const d=new Date(e.createdAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
  const bars=$('mood-bars');bars.replaceChildren();
  for(const mood of ['happy','calm','grateful','sad','excited']){
    const count=entries.filter(e=>e.mood===mood).length;
    const row=document.createElement('div');row.className='mood-track';
    const label=document.createElement('span');label.textContent=moods[mood];
    const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('div');fill.style.width=`${entries.length?count/entries.length*100:0}%`;bar.append(fill);
    const number=document.createElement('span');number.textContent=String(count);row.append(label,bar,number);bars.append(row);
  }
}
function renderBackups(){
  if(!state.data)return;
  $('drive-heading').textContent=state.data.hasDrive?'Google Drive connected':'Google Drive';
  $('drive-description').textContent=state.data.hasDrive?'Encrypted backup and sync are available.':'Connect in Settings to enable private cloud backup.';
  const last=state.data.settings.cloudLastSync;
  $('sync-last').textContent=last?`Last synced ${dateString(last)} at ${new Date(last).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}`:(state.data.hasDrive?'Connected · Not synced yet':'Not connected');
  $('cloud-sync').disabled=!state.data.hasDrive;
  $('cloud-restore').disabled=!state.data.hasDrive;
  $('top-backup').title=state.data.hasDrive?'Sync encrypted data to Google Drive':'Connect Google Drive to sync';
}
function editorSnapshot(){return JSON.stringify(['entry-title','entry-date','entry-mood','entry-body','entry-tags','entry-reminder'].map(id=>$(id).value));}
function openEditor(entry=null){
  state.selected=entry?.id||null;
  $('editor-label').textContent=entry?'A moment, revisited ✧':'Write your heart out ✧';
  $('entry-title').value=entry?.title||'';
  $('entry-mood').value=entry?.mood||'calm';
  $('entry-body').value=entry?.body||'';
  $('entry-tags').value=entry?.tags||'';
  $('entry-reminder').value=entry?.remindAt?new Date(entry.remindAt).toLocaleString('sv-SE').replace(' ','T').slice(0,16):'';
  $('entry-date').value=entry?.entryDate||localDay(entry?.createdAt||new Date());
  $('editor-delete').classList.toggle('hidden',!entry);
  updateWordCount();state.editorInitial=editorSnapshot();$('editor-overlay').classList.remove('hidden');$('entry-title').focus();
}
function closeEditor(force=false){ if(!force&&editorSnapshot()!==state.editorInitial&&!window.confirm('Discard unsaved changes to this entry?'))return; $('editor-overlay').classList.add('hidden');state.selected=null;state.editorInitial=''; }
function updateWordCount(){const value=$('entry-body').value.trim();$('editor-words').textContent=`${value?value.split(/\s+/u).length:0} words`;}
function askBackupPassword(title,message){
  return new Promise(resolve=>{
    $('password-title').textContent=title;$('password-message').textContent=message;
    $('backup-password').value='';$('password-overlay').classList.remove('hidden');$('backup-password').focus();
    const cleanup=()=>{$('password-overlay').classList.add('hidden');$('password-form').removeEventListener('submit',submit);$('password-cancel').removeEventListener('click',cancel);};
    const submit=e=>{e.preventDefault();const value=$('backup-password').value;cleanup();resolve(value);};
    const cancel=()=>{cleanup();resolve(null);};
    $('password-form').addEventListener('submit',submit);$('password-cancel').addEventListener('click',cancel);
  });
}
async function saveAppearance(settings){const data=await request('save-settings',settings);displayApp(data);notify('Your preferences have been saved.');}
async function lock(){await request('lock');state.data=null;gate(true);}
function setWorking(button,working){button.disabled=working;button.dataset.oldLabel ||= button.textContent;if(working)button.textContent='Working…';else button.textContent=button.dataset.oldLabel;}
function wire(){
  $('gate-start').addEventListener('click',()=>showGateAuth());
  $('gate-import-start').addEventListener('click',()=>{showGateAuth(true);notify(state.gateMode==='setup'?'Create a new private vault, then import an encrypted backup from Backup.':'Unlock first, then import a backup from the Backup tab.');});
  $('gate-back').addEventListener('click',()=>{$('gate-auth').classList.add('hidden');$('gate-landing').classList.remove('hidden');state.pendingRestore=false;});
  $('gate-form').addEventListener('submit',async e=>{
    e.preventDefault();const passphrase=$('passphrase').value;
    if(state.gateMode==='setup'&&passphrase!==$('confirm-pass').value){notify('Passphrases do not match.',true);return;}
    const button=$('gate-submit');button.disabled=true;
    try{displayApp(await request(state.gateMode==='setup'?'setup':'unlock',{passphrase}));notify('Welcome to your private space. ✦');}
    catch{}finally{button.disabled=false;}
  });
  $('legacy-import').addEventListener('click',async()=>{const pw=$('passphrase').value;if(!pw){notify('Enter the password used by your older Native diary first.',true);return;}if(!window.confirm('Import your v1.1 native diary? Your old encrypted vault will stay untouched.'))return;try{state.pendingRestore=false;displayApp(await request('import-native',{passphrase:pw}));notify('Old diary imported. Your original vault is preserved.');}catch{}});
  $('show-pass').addEventListener('click',()=>{$('passphrase').type=$('passphrase').type==='password'?'text':'password';});
  for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>switchView(b.dataset.view));
  $('global-search').addEventListener('click',()=>{switchView('journal');$('search').focus();});
  $('home-calendar-more').addEventListener('click',()=>switchView('calendar'));
  $('home-reminders-more').addEventListener('click',()=>switchView('reminders'));
  $('reminders-create').addEventListener('click',()=>openEditor());
  $('explore-write').addEventListener('click',()=>{openEditor();$('entry-title').value='A moment of reflection';$('entry-body').value=$('explore-prompt').textContent+'\n\n';updateWordCount();state.editorInitial=editorSnapshot();$('entry-body').focus();});
  $('explore-insights').addEventListener('click',()=>switchView('insights'));
  for(const id of ['home-write','home-first'])$(id).addEventListener('click',()=>openEditor());
  $('home-all').addEventListener('click',()=>switchView('journal'));
  $('home-prompt-write').addEventListener('click',()=>{openEditor();$('entry-title').value='A little reflection';$('entry-body').value=$('home-prompt').textContent+'\n\n';updateWordCount();$('entry-body').focus();state.editorInitial=editorSnapshot();});
  for(const id of ['top-new','empty-new'])$(id).addEventListener('click',()=>openEditor());
  for(const id of ['lock-button','settings-lock'])$(id).addEventListener('click',lock);
  $('search').addEventListener('input',renderEntries);$('mood-filter').addEventListener('change',renderEntries);
  $('editor-close').addEventListener('click',closeEditor);$('editor-cancel').addEventListener('click',closeEditor);
  $('entry-body').addEventListener('input',updateWordCount);
  $('editor-overlay').addEventListener('click',e=>{if(e.target===$('editor-overlay'))closeEditor();});
  $('editor-form').addEventListener('submit',async e=>{
    e.preventDefault();const old=allEntries().find(x=>x.id===state.selected);
    const item={id:state.selected,title:$('entry-title').value,body:$('entry-body').value,mood:$('entry-mood').value,
      tags:$('entry-tags').value,remindAt:$('entry-reminder').value?new Date($('entry-reminder').value).toISOString():'',entryDate:$('entry-date').value,pinned:old?.pinned||false};
    try{displayApp(await request('save-entry',item));closeEditor(true);notify('Memory saved and encrypted. ✦');}catch{}
  });
  $('editor-delete').addEventListener('click',async()=>{
    if(!state.selected||!window.confirm('Delete this memory? Its content will be removed from the active diary and future synced snapshots. Older backups may still contain it.'))return;
    try{displayApp(await request('delete-entry',{id:state.selected}));closeEditor(true);notify('Entry deleted.');}catch{}
  });
  $('cal-prev').addEventListener('click',()=>{state.calendar=new Date(state.calendar.getFullYear(),state.calendar.getMonth()-1,1);state.calDate=null;renderCalendar();});
  $('cal-next').addEventListener('click',()=>{state.calendar=new Date(state.calendar.getFullYear(),state.calendar.getMonth()+1,1);state.calDate=null;renderCalendar();});
  document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>saveAppearance({theme:b.dataset.themeChoice})));
  $('accent-input').addEventListener('change',()=>saveAppearance({theme:'custom',accent:$('accent-input').value}));
  $('auto-sync').addEventListener('change',e=>saveAppearance({autoSync:e.target.checked}));
  $('notifications').addEventListener('change',e=>saveAppearance({notifications:e.target.checked}));
  $('save-display-name').addEventListener('click',()=>saveAppearance({displayName:$('display-name').value.trim()}));
  $('drive-connect').addEventListener('click',async()=>{
    const button=$('drive-connect'),clientId=$('oauth-id').value.trim();setWorking(button,true);
    try{displayApp(await request('drive-connect',{clientId}));notify('Google Drive connected. You can now sync your journal.');}catch{}finally{setWorking(button,false);}
  });
  $('drive-disconnect').addEventListener('click',async()=>{
    if(!window.confirm('Disconnect from Google Drive? Existing encrypted cloud backup will remain in your account.'))return;
    try{displayApp(await request('drive-disconnect'));notify('Google Drive disconnected.');}catch{}
  });
  async function sync(){
    if(!state.data?.hasDrive){switchView('settings');notify('Connect Google Drive in Settings to sync.',true);return;}
    const button=$('cloud-sync');setWorking(button,true);
    try{displayApp(await request('drive-sync'));notify('Your encrypted memories are synced. ✦');}catch{}finally{setWorking(button,false);}
  }
  $('cloud-sync').addEventListener('click',sync);$('top-backup').addEventListener('click',sync);
  $('local-export').addEventListener('click',async()=>{
    try{const result=await request('local-export');if(!result.cancelled)notify('Encrypted backup exported successfully.');}catch{}
  });
  $('local-import').addEventListener('click',async()=>{
    if(!window.confirm('Restore a backup? This REPLACES your current entries. A safety copy of your current vault is saved.'))return;
    const passphrase=await askBackupPassword('Unlock local backup','Enter the passphrase for the backup you want to restore.');if(!passphrase)return;
    try{const result=await request('local-import',{passphrase});if(!result.cancelled){displayApp(result);notify('Local backup restored.');}}catch{}
  });
  $('cloud-restore').addEventListener('click',async()=>{
    if(!window.confirm('Restore from Google Drive? This REPLACES your current entries. A safety copy of your current vault is saved.'))return;
    const passphrase=await askBackupPassword('Unlock cloud backup','Enter the passphrase used to encrypt the Google Drive diary.');if(!passphrase)return;
    try{displayApp(await request('drive-restore',{passphrase}));notify('Cloud backup restored.');}catch{}
  });
  $('check-updates').addEventListener('click',async()=>{
    const button=$('check-updates');setWorking(button,true);
    try{
      const result=await request('check-updates');
      if(!result.configured){notify('Release checking becomes available after the GitHub repository is configured.',true);return;}
      if(!result.newer){notify(`You're on the latest published version (${result.current}).`);return;}
      if(window.confirm(`Version ${result.latest} is available. Open the GitHub Releases page to download it?`))await request('open-url',{url:result.url});
    }catch{}finally{setWorking(button,false);}
  });
  window.luma.on('sync-status',payload=>{
    if(payload?.kind==='error')notify(payload.message,true);
    if(payload?.kind==='success'&&state.data)request('load').then(displayApp).catch(()=>{});
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!$('editor-overlay').classList.contains('hidden'))closeEditor();
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&state.data){e.preventDefault();switchView('journal');$('search').focus();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'&&state.data){e.preventDefault();openEditor();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&!$('editor-overlay').classList.contains('hidden')){e.preventDefault();$('editor-form').requestSubmit();}
  });
}
(async()=>{wire();try{const result=await request('status');gate(result.exists);$('legacy-import').classList.toggle('hidden',result.exists||!result.hasLegacy);}catch{gate(false);}})();
