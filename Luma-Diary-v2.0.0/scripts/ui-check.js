'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const root=p.join(__dirname,'../src/renderer');
const html=fs.readFileSync(p.join(root,'index.html'),'utf8');
const js=fs.readFileSync(p.join(root,'app.js'),'utf8');
const styles=fs.readFileSync(p.join(root,'glass-v2.css'),'utf8');
for(const match of js.matchAll(/\$\('([a-z0-9-]+)'\)/g)){
  assert.match(html,new RegExp(`id=["']${match[1]}["']`),`Missing UI element ${match[1]}`);
}
for(const view of ['home','journal','calendar','explore','reminders','backups','settings']){
  assert.match(html,new RegExp(`id="view-${view}"`));assert.match(html,new RegExp(`data-view="${view}"`));
}
assert.match(html,/id="gate-start"/);assert.match(html,/id="gate-auth"/);
assert.match(html,/glass-v2\.css/);assert.match(styles,/backdrop-filter:\s*blur/);
assert.match(html,/Content-Security-Policy/);assert.match(html,/assets\/icon\.png/);
console.log('PASS: v2 glass UI, onboarding, seven navigation tabs, icon resources and all bound DOM controls.');
