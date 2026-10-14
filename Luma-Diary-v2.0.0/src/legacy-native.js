'use strict';
// Import v1.1.0 Go Native vaults. Never mutate the legacy source file.
const fs=require('node:fs');
const crypto=require('node:crypto');
const MAX_BYTES=20*1024*1024;
function decryptLegacyFile(filename, passphrase){
  if(typeof passphrase!=='string'||passphrase.length<10)throw Error('Enter your original diary passphrase.');
  const st=fs.statSync(filename);
  if(st.size<40||st.size>MAX_BYTES)throw Error('Legacy diary size is invalid.');
  const obj=JSON.parse(fs.readFileSync(filename,'utf8'));
  if(obj.version!==1||obj.format!=='luma-portable-v1'||obj.kdf!=='pbkdf2-sha256-600000')throw Error('This is not a v1.1 Native diary.');
  const salt=Buffer.from(obj.salt,'base64');
  const iv=Buffer.from(obj.iv,'base64');
  const body=Buffer.from(obj.ciphertext,'base64');
  if(salt.length!==24||iv.length!==12||body.length<17||body.length>MAX_BYTES)throw Error('Legacy diary is invalid.');
  const key=crypto.pbkdf2Sync(passphrase,salt,600000,32,'sha256');
  try {
    const tag=body.subarray(body.length-16);
    const cipher=body.subarray(0,body.length-16);
    const decoder=crypto.createDecipheriv('aes-256-gcm',key,iv);
    decoder.setAuthTag(tag);
    const decrypted=Buffer.concat([decoder.update(cipher),decoder.final()]);
    const data=JSON.parse(decrypted.toString('utf8'));
    if(!Array.isArray(data.entries)||!data.settings||typeof data.settings!=='object')throw Error('Unexpected legacy diary format.');
    return data;
  }catch(e){if(e.message==='Unexpected legacy diary format.')throw e;throw Error('Wrong passphrase or damaged legacy diary.');}
  finally{key.fill(0);}
}
module.exports={decryptLegacyFile};
