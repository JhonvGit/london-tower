(function(){
  const style=document.createElement('style');style.textContent=`
    .theme-toggle{border:1px solid var(--line);background:var(--white);color:var(--ink);border-radius:9px;padding:8px 11px;font-size:13px;font-weight:750}
    .theme-toggle:hover{border-color:var(--blue)}
    [data-theme="dark"]{--mist:#0c1724;--white:#142337;--ink:#edf3f8;--muted:#aebbc8;--line:#2d4053;--shadow:0 22px 55px #0006}
    [data-theme="dark"] .shell,[data-theme="dark"] main{background:var(--mist)}
    [data-theme="dark"] .hero{background:linear-gradient(135deg,#172b40,#1d3b50)}
    [data-theme="dark"] .room,[data-theme="dark"] .day,[data-theme="dark"] .cal-nav button,[data-theme="dark"] input,[data-theme="dark"] select,[data-theme="dark"] textarea,[data-theme="dark"] .secondary{background:#142337;color:var(--ink)}
    [data-theme="dark"] .summary,[data-theme="dark"] .stat{background:#102033;border-color:var(--line)}
    [data-theme="dark"] .terms{background:#102033;color:#c4d0db}
    .reservations-tab-page{display:none}.reservations-tab-page .admin-reservation{padding:16px 0}
    @media(max-width:700px){.theme-toggle{font-size:0;padding:8px 10px}.theme-toggle::before{content:'◐';font-size:16px}}
  `;document.head.appendChild(style);
  const topbar=document.querySelector('.topbar'),resident=document.querySelector('.resident');
  if(topbar&&resident){const toggle=document.createElement('button');toggle.className='theme-toggle';toggle.id='themeToggle';toggle.type='button';toggle.setAttribute('aria-label','Alternar tema escuro');resident.insertBefore(toggle,resident.firstChild);const setTheme=dark=>{document.documentElement.dataset.theme=dark?'dark':'light';toggle.textContent=dark?'☀️ Tema claro':'🌙 Tema escuro';localStorage.setItem('ltTheme',dark?'dark':'light')};setTheme(localStorage.getItem('ltTheme')==='dark');toggle.onclick=()=>setTheme(document.documentElement.dataset.theme!=='dark')}
  const navAdmin=document.getElementById('navAdmin'),nav=document.querySelector('.nav'),main=document.querySelector('main');
  if(!navAdmin||!nav||!main)return;
  navAdmin.insertAdjacentHTML('afterend','<button id="navAdminReservations" class="hidden"><span class="dot" style="background:#e4be7c"></span>Reservas realizadas</button>');
  const navReservationsAdmin=document.getElementById('navAdminReservations');
  main.insertAdjacentHTML('beforeend','<section id="reservationsTabPage" class="reservations-tab-page"><div class="hero"><div><div class="eyebrow">Acesso administrativo</div><h2>Reservas realizadas</h2><p>Consulte as reservas registradas no condomínio.</p></div><div class="hero-mark">LT</div></div><section class="panel"><div class="panel-head"><div><h3>Lista de reservas</h3><p>Dados dos responsáveis e horários agendados.</p></div></div><div id="reservationsTabList"></div></section></section>');
  const tabPage=document.getElementById('reservationsTabPage'),tabList=document.getElementById('reservationsTabList');
  function copyReservations(){const source=document.getElementById('adminReservations');if(source)tabList.innerHTML=source.innerHTML}
  const oldRenderAdminReservations=renderAdminReservations;renderAdminReservations=()=>{oldRenderAdminReservations();copyReservations()};
  const oldOpenApp=openApp;openApp=user=>{oldOpenApp(user);navReservationsAdmin.classList.toggle('hidden',!['admin','portaria'].includes(user.role))};
  navReservationsAdmin.onclick=async()=>{if(!current||!['admin','portaria'].includes(current.role))return;bookingPage.classList.add('hidden');adminPage.classList.add('hidden');tabPage.style.display='block';navBooking.classList.remove('active');navAdmin.classList.remove('active');navReservationsAdmin.classList.add('active');pageTitle.textContent='Reservas realizadas';const requests=[window.ltLoadBookings()];if(current.role==='admin')requests.push(window.ltLoadAccounts());const results=await Promise.allSettled(requests);const failed=results.find(result=>result.status==='rejected');if(failed)show(failed.reason.message);renderAdminReservations();copyReservations()};
  navBooking.addEventListener('click',()=>{tabPage.style.display='none';navReservationsAdmin.classList.remove('active')});
  navAdmin.addEventListener('click',()=>{tabPage.style.display='none';navReservationsAdmin.classList.remove('active')});
})();
