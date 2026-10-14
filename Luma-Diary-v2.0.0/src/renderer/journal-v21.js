'use strict';
// Luma Diary 2.1 — in-page journal editor (saved through the existing encrypted vault).
(function () {
  const el = id => document.getElementById(id);
  let mounted=false, editing=false;
  const originalOpen=window.openEditor, originalSwitch=window.switchView;
  const originalRenderEntries=window.renderEntries;
  const dirty=()=>editing && editorSnapshot()!==state.editorInitial;
  function canLeave(){return !dirty() || window.confirm('Unsaved changes will be lost. Continue?');}
  function status(){
    const label=el('journal-save-status'); if(!label)return;
    label.textContent=dirty()?'● Unsaved changes':'✓ All changes saved';
    label.style.color=dirty()?'#c17b2d':'#27a77b';
  }
  function stats(){
    if(!mounted || !state.data)return;
    const entries=allEntries();
    el('journal-total').textContent=entries.length;
    el('journal-streak').textContent=dayStreak(entries);
    const selected=entries.find(e=>e.id===state.selected);
    el('journal-last').textContent=selected?dateString(selected.updatedAt):'New';
    el('journal-empty').classList.toggle('hidden',el('entries-grid').children.length!==0);
  }
  function mount(){
    if(mounted)return; mounted=true;
    const root=el('view-journal');
    const legacy=document.createElement('div'); legacy.id='journal-legacy';legacy.hidden=true;
    while(root.firstChild)legacy.append(root.firstChild);
    root.append(legacy);
    root.insertAdjacentHTML('afterbegin',[
      '<div class="j21-banner glass"><div class="j21-pen">✎</div><div><h1>Journal</h1><p>Write freely and save your thoughts.</p></div><img src="../../assets/icon.png" alt="" class="j21-hero-icon"><span class="j21-quote">A journal is a return<br>to yourself. ✦</span></div>',
      '<div class="j21-grid"><section class="j21-primary glass"><div id="j21-form-slot"></div></section>',
      '<aside class="j21-side">',
      '<section class="j21-panel glass"><h2>ⓘ &nbsp; Entry Info</h2><label for="entry-tags">Tags</label><div id="j21-tags"></div><label for="entry-reminder">Reminder (optional)</label><div id="j21-reminder"></div></section>',
      '<section class="j21-panel glass"><h2>▤ &nbsp; Recent Entries</h2><div id="j21-search"></div><div id="j21-list"></div><p id="journal-empty" class="j21-empty hidden">Your saved memories will appear here.</p></section>',
      '<section class="j21-panel glass"><h2>▥ &nbsp; Writing Stats</h2><div class="j21-stats"><div><span>✦</span><strong id="journal-streak">0</strong><small>Day streak</small></div><div><span>▤</span><strong id="journal-total">0</strong><small>Entries</small></div><div><span>◷</span><strong id="journal-last">New</strong><small>Last edited</small></div></div></section>',
      '</aside></div>'
    ].join(''));
    const form=el('editor-form');
    const ids=['entry-title','entry-date','entry-mood','entry-body','entry-tags','entry-reminder','editor-words','editor-delete','editor-cancel'];
    const saved={};ids.forEach(id=>saved[id]=el(id));
    form.className='j21-form';
    form.innerHTML=[
      '<div class="j21-edit-head"><div id="j21-title"></div><div id="j21-date"></div><div id="j21-mood"></div>',
      '<button id="j21-save" class="primary" type="submit">▣ &nbsp; Save</button><button id="j21-new" type="button">+ New</button></div>',
      '<div class="j21-status"><span id="journal-save-status">✓ All changes saved</span><span>Private · Offline · Encrypted</span></div>',
      '<div class="j21-paper"><div class="j21-toolbar"><strong>Plain text editor</strong><button type="button" data-format="bold" title="Wrap selected text with Markdown bold markers">B</button><button type="button" data-format="italic" title="Italic Markdown">I</button><button type="button" data-format="bullet" title="Bullet list">☷</button><span>Write naturally, like Notepad</span></div><div id="j21-body"></div><div class="j21-paper-foot"><span>✧ Your words, your space</span><span id="j21-word-count"></span></div></div>',
      '<div class="j21-foot"><span id="j21-delete"></span><span id="j21-cancel"></span></div>'
    ].join('');
    [
      ['entry-title','j21-title'],['entry-date','j21-date'],['entry-mood','j21-mood'],
      ['entry-body','j21-body'],['editor-words','j21-word-count'],['editor-delete','j21-delete'],
      ['editor-cancel','j21-cancel'],['entry-tags','j21-tags'],['entry-reminder','j21-reminder']
    ].forEach(pair=>el(pair[1]).append(saved[pair[0]]));
    el('j21-form-slot').append(form);
    el('j21-search').append(el('search'));el('j21-list').append(el('entries-grid'));
    saved['editor-cancel'].textContent='Clear draft';
    el('j21-new').addEventListener('click',()=>window.openEditor());
    ['entry-title','entry-date','entry-mood','entry-body','entry-tags','entry-reminder'].forEach(id=>{
      ['input','change'].forEach(event=>saved[id].addEventListener(event,()=>{
        status();
        if(id==='entry-body')updateWordCount();
      }));
    });
    root.querySelectorAll('[data-format]').forEach(button=>button.addEventListener('click',()=>{
      const field=el('entry-body'),start=field.selectionStart,end=field.selectionEnd;
      const selection=field.value.slice(start,end),type=button.dataset.format;
      let content=selection;
      if(type==='bold')content='**'+(selection||'text')+'**';
      if(type==='italic')content='*'+(selection||'text')+'*';
      if(type==='bullet')content=(selection||'List item').split('\n').map(s=>'- '+s).join('\n');
      field.focus();field.setRangeText(content,start,end,'end');field.dispatchEvent(new Event('input',{bubbles:true}));
    }));
  }
  window.openEditor=function(entry=null,force=false){
    if(!mounted)mount();
    if(!force&&!canLeave())return;
    originalOpen(entry);
    el('editor-overlay').classList.add('hidden');
    editing=true;state.editorInitial=editorSnapshot();
    originalSwitch('journal');status();stats();
    el(entry?'entry-body':'entry-title').focus();
  };
  window.closeEditor=function(force=false){
    if(force){
      const all=allEntries();
      const latest=state.selected?all.find(e=>e.id===state.selected):[...all].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
      if(latest){window.openEditor(latest,true);return;}
      window.openEditor(null,true);return;
    }
    if(canLeave())window.openEditor(null,true);
  };
  window.switchView=function(view){
    if(state.view==='journal'&&view!=='journal'&&!canLeave())return;
    originalSwitch(view);
    if(view==='journal'){
      if(!mounted)mount();
      if(!editing){
        const latest=[...allEntries()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
        window.openEditor(latest||null,true);
      }
      stats();
    }
  };
  window.renderEntries=function(){originalRenderEntries();stats();};
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&state.data&&state.view==='journal'){
      e.preventDefault();e.stopImmediatePropagation();el('editor-form').requestSubmit();
    }
  },true);
  window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});
  mount();
})();