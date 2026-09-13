(function(){
  const style=document.createElement('style');style.textContent='.term-editor{grid-column:1/-1}.term-editor textarea{min-height:170px;resize:vertical}.term-editor .primary{width:auto;padding:10px 16px;margin-top:12px}';document.head.appendChild(style);
  const panel=document.createElement('section');panel.className='panel term-editor';panel.innerHTML='<div class="panel-head"><div><h3>Termo de responsabilidade</h3><p>Edite o texto exibido antes da confirmação da reserva.</p></div></div><textarea id="termEditor" aria-label="Texto do termo de responsabilidade"></textarea><button class="primary" id="saveTerm" type="button">Salvar termo</button><div class="error" id="termError"></div>';document.querySelector('#adminPage .admin').appendChild(panel);
  function showTerm(text){const box=document.querySelector('.terms');if(!box)return;box.replaceChildren(...String(text||'').split(/\n\s*\n/).filter(Boolean).map(p=>{const el=document.createElement('p');el.textContent=p;return el}))}
  async function loadTerm(){try{const data=await window.ltApi('/api/settings');termEditor.value=data.term||'';showTerm(data.term)}catch(err){termError.textContent=err.message}}
  window.ltLoadTerm=loadTerm;
  const oldOpenApp=openApp;openApp=user=>{oldOpenApp(user);window.ltApi('/api/settings').then(data=>showTerm(data.term)).catch(()=>{})};
  saveTerm.onclick=async()=>{termError.textContent='';try{const data=await window.ltApi('/api/settings',{method:'PATCH',body:JSON.stringify({term:termEditor.value})});showTerm(data.term);show('Termo atualizado com sucesso.')}catch(err){termError.textContent=err.message}};
  navAdmin.addEventListener('click',()=>{if(current?.role==='admin')loadTerm()});
  document.querySelector('#termsModal .terms')?.addEventListener('DOMNodeInserted',()=>{});
})();
