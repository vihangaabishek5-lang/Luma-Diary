'use strict';
const {contextBridge,ipcRenderer} = require('electron');
const channels = new Set(['status','import-native','setup','unlock','lock','load','save-entry','delete-entry','save-settings',
  'drive-connect','drive-disconnect','drive-sync','drive-restore','local-export','local-import','check-updates','open-url']);
contextBridge.exposeInMainWorld('luma',Object.freeze({
  call: (channel, args) => {
    if (!channels.has(channel)) return Promise.reject(Error('Invalid request.'));
    return ipcRenderer.invoke(channel,args);
  },
  on: (event, callback) => {
    if (!['sync-status','reminder'].includes(event) || typeof callback !== 'function') return ()=>{};
    const listener=(_e,payload)=>callback(payload);
    ipcRenderer.on(event,listener);
    return ()=>ipcRenderer.removeListener(event,listener);
  }
}));
