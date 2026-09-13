(function(){
  const style=document.createElement('style');style.textContent=`
    .login-art::after{content:'';position:absolute;inset:auto -14% -18% auto;width:380px;height:380px;border:1px solid #ffffff2e;border-radius:50%;box-shadow:0 0 0 34px #ffffff08,0 0 0 68px #ffffff05;pointer-events:none}
    .login-card{background:#fffffffa;border:1px solid #dfe6ed;border-radius:20px;padding:32px;box-shadow:0 20px 55px #10253f20}
    .login-card h2{font-weight:850}.login-card form{margin-top:24px}.login-card .primary{box-shadow:0 8px 18px #2f6d9140}
    .login-status{min-height:20px;margin-top:12px;font-size:13px;color:var(--red)}
    [data-theme="dark"] .login-card{background:#142337;border-color:#2d4053;box-shadow:0 20px 55px #0008}
  `;document.head.appendChild(style);
  const form=document.getElementById('loginForm'),error=document.getElementById('loginError');
  if(form&&error){const status=document.createElement('div');status.className='login-status';status.id='loginStatus';error.insertAdjacentElement('afterend',status);const oldSubmit=form.onsubmit;form.addEventListener('submit',()=>{status.textContent='Verificando acesso…'});const observer=new MutationObserver(()=>{if(error.textContent){status.textContent=error.textContent;error.textContent=''}});observer.observe(error,{childList:true,characterData:true,subtree:true})}
})();
