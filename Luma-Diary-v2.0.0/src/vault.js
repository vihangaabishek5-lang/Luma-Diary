'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const MAX_BYTES = 15 * 1024 * 1024;
function createSalt(){ return crypto.randomBytes(24).toString('base64'); }
function keyFromPassword(password, salt) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 1024) throw Error('Use a passphrase with at least 10 characters.');
  const rawSalt = Buffer.from(salt, 'base64');
  if (rawSalt.length !== 24) throw Error('Invalid diary backup salt.');
  return crypto.scryptSync(password, rawSalt, 32, PARAMS);
}
function encrypt(data, key, salt) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw Error('Diary is locked.');
  const payload = Buffer.from(JSON.stringify(data), 'utf8');
  if (payload.length > MAX_BYTES) throw Error('Diary is too large to encrypt.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  return {
    version: 1, format: 'luma-diary-v1',
    kdf: 'scrypt-N32768-r8-p1', salt,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}
function assertEnvelope(obj) {
  if (!obj || obj.version !== 1 || obj.format !== 'luma-diary-v1' || obj.kdf !== 'scrypt-N32768-r8-p1' ||
      !['salt','iv','tag','ciphertext'].every(k => typeof obj[k] === 'string') ||
      Buffer.from(obj.salt, 'base64').length !== 24 || Buffer.from(obj.iv,'base64').length !== 12 ||
      Buffer.from(obj.tag, 'base64').length !== 16) throw Error('Invalid Luma Diary backup.');
}
function decrypt(envelope, key) {
  assertEnvelope(envelope);
  if (!Buffer.isBuffer(key) || key.length !== 32) throw Error('Diary is locked.');
  const encrypted = Buffer.from(envelope.ciphertext, 'base64');
  if (encrypted.length > MAX_BYTES) throw Error('Backup is too large.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv,'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
  let result;
  try { result = JSON.parse(Buffer.concat([decipher.update(encrypted),decipher.final()]).toString('utf8')); }
  catch { throw Error('Incorrect passphrase or damaged encrypted backup.'); }
  if (!result || !Array.isArray(result.entries) || typeof result.settings !== 'object') throw Error('Unrecognized diary data.');
  return result;
}
function readEnvelope(filename) {
  if (fs.statSync(filename).size > MAX_BYTES * 1.6) throw Error('Backup file is too large.');
  const obj = JSON.parse(fs.readFileSync(filename, 'utf8'));
  assertEnvelope(obj); return obj;
}
function writeAtomic(filename, obj) {
  const dir = path.dirname(filename);
  fs.mkdirSync(dir, {recursive:true});
  const temp = `${filename}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(obj, null, 2), {encoding:'utf8', mode:0o600});
    fs.renameSync(temp, filename);
  } finally { try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {} }
}
function defaultData() {
  return {entries:[],settings:{theme:'ocean',accent:'#367bf6',displayName:'',autoSync:true,notifications:true, driveAuth:null, cloudLastSync:null},createdAt:new Date().toISOString()};
}
function mergeEntries(a,b) {
  const entries = new Map();
  for (const item of [...a,...b]) {
    if (!item || typeof item.id !== 'string' || typeof item.updatedAt !== 'string') continue;
    const old = entries.get(item.id);
    if (!old || item.updatedAt > old.updatedAt) entries.set(item.id,item);
  }
  return [...entries.values()].sort((x,y) => (y.updatedAt||'').localeCompare(x.updatedAt||''));
}
function cloudData(data) {
  const {driveAuth, cloudLastSync, ...settings} = data.settings;
  return { entries:data.entries, settings, createdAt:data.createdAt };
}
module.exports = {createSalt,keyFromPassword,encrypt,decrypt,assertEnvelope,readEnvelope,writeAtomic,defaultData,mergeEntries,cloudData};
