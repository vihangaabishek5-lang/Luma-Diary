'use strict';
const crypto = require('node:crypto');
const http = require('node:http');
const FILE_NAME = 'luma-diary-vault.json';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const b64url = (bytes) => Buffer.from(bytes).toString('base64url');
const checkClientId = id => typeof id === 'string' && /^[a-zA-Z0-9._-]{12,250}\.apps\.googleusercontent\.com$/.test(id.trim());
async function jsonResponse(resp) {
  const text = await resp.text();
  let result;
  try { result=JSON.parse(text); } catch { result={error:{message:text.slice(0,160)}}; }
  if (!resp.ok) throw Error(`Google API (${resp.status}): ${result.error_description || result.error?.message || 'Request failed'}`);
  return result;
}
async function authorize(clientId, openBrowser) {
  if (!checkClientId(clientId)) throw Error('Enter a valid Google OAuth Desktop Client ID.');
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(24));
  let server;
  try {
    server = http.createServer();
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen(0,'127.0.0.1',resolve);
    });
    const port = server.address().port;
    const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
    const params = new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:SCOPE,
      access_type:'offline',prompt:'consent',code_challenge:challenge,code_challenge_method:'S256',state});
    const responseCode = new Promise((resolve,reject)=> {
      server.on('request',(req,res)=> {
        const u = new URL(req.url, redirectUri);
        res.setHeader('Content-Type','text/html; charset=utf-8');
        res.setHeader('Cache-Control','no-store');
        if (u.pathname !== '/oauth2callback' || u.searchParams.get('state') !== state) {
          res.writeHead(400);res.end('<h2>Invalid sign-in response. Return to Luma Diary.</h2>');return;
        }
        const error = u.searchParams.get('error');
        const code = u.searchParams.get('code');
        if (error || !code) {
          res.writeHead(400);res.end('<h2>Sign-in cancelled.</h2>');reject(Error(`Google sign-in: ${error||'missing code'}`));return;
        }
        res.writeHead(200);res.end('<h2>Connected to Luma Diary ✓</h2><p>You can close this tab and return to the app.</p>');
        resolve(code);
      });
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    await openBrowser(url);
    const code = await Promise.race([responseCode,new Promise((_, reject)=>setTimeout(()=>reject(Error('Google sign-in timed out.')),120000))]);
    const resp = await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({code,client_id:clientId,redirect_uri:redirectUri,grant_type:'authorization_code',code_verifier:verifier}),
      signal:AbortSignal.timeout(25000)
    });
    const tokens=await jsonResponse(resp);
    if (!tokens.refresh_token) throw Error('Google did not provide a refresh token. Disconnect and retry.');
    return {clientId,refreshToken:tokens.refresh_token};
  } finally { if (server) server.close(); }
}
async function accessToken(auth) {
  if (!auth?.refreshToken || !checkClientId(auth.clientId)) throw Error('Connect your Google Drive account first.');
  const resp=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:auth.clientId,refresh_token:auth.refreshToken,grant_type:'refresh_token'}),
    signal:AbortSignal.timeout(25000)
  });
  const tokens=await jsonResponse(resp);
  return tokens.access_token;
}
async function driveRequest(token, url, options={}) {
  const headers={Authorization:`Bearer ${token}`,...(options.headers||{})};
  const response = await fetch(url,{...options,headers,signal:AbortSignal.timeout(35000)});
  if (!response.ok) await jsonResponse(response);
  return response;
}
async function locate(token) {
  const url=new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('spaces','appDataFolder');
  url.searchParams.set('q',`name = '${FILE_NAME}' and trashed = false`);
  url.searchParams.set('fields','nextPageToken,files(id,name,modifiedTime)');
  url.searchParams.set('pageSize','100');
  const resp=await driveRequest(token,url.toString());
  const data=await resp.json();
  return (data.files||[]).sort((a,b)=>String(b.modifiedTime).localeCompare(String(a.modifiedTime)))[0] || null;
}
async function download(token,fileId) {
  if (!/^[A-Za-z0-9_-]{5,300}$/.test(fileId)) throw Error('Invalid backup ID.');
  const resp=await driveRequest(token,`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  const body=await resp.text();
  if (body.length>22000000) throw Error('Cloud backup exceeds size limit.');
  return JSON.parse(body);
}
async function upload(token,existing,payload) {
  const body=JSON.stringify(payload);
  if (Buffer.byteLength(body)>20000000) throw Error('Cloud backup is too large.');
  if (existing?.id) {
    const resp=await driveRequest(token,`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media&fields=id,modifiedTime`,{
      method:'PATCH',headers:{'Content-Type':'application/json'},body});
    return resp.json();
  }
  const boundary='luma'+crypto.randomBytes(12).toString('hex');
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:FILE_NAME,parents:['appDataFolder'],mimeType:'application/json'})}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const resp=await driveRequest(token,'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',{
    method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body:multipart});
  return resp.json();
}
module.exports={authorize,accessToken,locate,download,upload,checkClientId};
