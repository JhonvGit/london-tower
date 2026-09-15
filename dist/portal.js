'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rooms = [
    {name:'Oxford',capacity:40,image:'photo-1519167758481-83f550bb49b3',desc:'Ambiente acolhedor para comemorações e encontros.'},
    {name:'Napoli',capacity:30,image:'photo-1492684223066-81342ee5ff30',desc:'Salão elegante para reuniões e celebrações menores.'},
    {name:'Rooftop',capacity:60,image:'photo-1519671482749-fd09be7ccebf',desc:'Espaço amplo para eventos especiais com vista.'}
  ];
  const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
  const tomorrow = () => { const d = new Date(today()+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10); };
  const format = value => { const d = new Date(value+'T12:00:00Z'); return Number.isNaN(d.getTime()) ? 'Data inválida' : new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(d); };
  const formatWithWeekday = value => { const d = new Date(value+'T12:00:00Z'); return Number.isNaN(d.getTime()) ? 'Data inválida' : new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(d); };
  const isSunday = value => { if(!value) return false; const d=new Date(value+'T12:00:00Z'); return !Number.isNaN(d.getTime()) && d.getUTCDay() === 0; };
  const getPreviousSaturday = value => { if(!value) return ''; const d=new Date(value+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10); };
  let user = null, items = [], availability = [], loaded = false, term = '', saving = false;
  let month = new Date(today()+'T12:00:00'), room = 'Oxford', selected = '', toastTimer;
  const staff = () => ['admin','portaria'].includes(user?.role);
  const busy = value => availability.some(b => b.room === room && b.date === value);
  const show = message => { $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),5000); };
  async function api(path, options={}) {
    const response = await fetch('/api/'+path,{...options,headers:{'Content-Type':'application/json'},credentials:'same-origin'});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) { if(response.status===401 && user) resetSession(); throw new Error(data.error || 'Não foi possível concluir a operação. Tente novamente.'); }
    return data;
  }
  const send = (path,method,data) => api(path,{method,body:JSON.stringify(data)});
  function resetSession() {
    user=null; items=[]; availability=[]; loaded=false; term='';
    document.querySelectorAll('.modal-back').forEach(el=>el.classList.add('hidden'));
    $('appView').classList.add('hidden'); $('loginView').classList.remove('hidden'); $('loginForm').reset();
    $('accountList').replaceChildren(); $('adminReservations').replaceChildren(); $('reservationList').replaceChildren();
    if($('fullReservationCards')) $('fullReservationCards').replaceChildren();
    $('credentialValue').textContent=''; $('passwordForm').reset(); $('bookingForm').reset(); selected='';
  }
  function page(target = 'booking') {
    if (typeof target === 'boolean') target = target ? 'admin' : 'booking';
    if (target === 'admin' && user?.role !== 'admin') return;
    $('bookingPage').classList.toggle('hidden', target !== 'booking');
    $('reservationsPage').classList.toggle('hidden', target !== 'reservations');
    $('adminPage').classList.toggle('hidden', target !== 'admin');
    $('navBooking').classList.toggle('active', target === 'booking');
    $('navReservations').classList.toggle('active', target === 'reservations');
    $('navAdmin').classList.toggle('active', target === 'admin');
    if (target === 'booking') $('pageTitle').textContent = 'Reservas de espaços';
    else if (target === 'reservations') $('pageTitle').textContent = staff() ? 'Quadro de Reservas' : 'Minhas Reservas';
    else if (target === 'admin') $('pageTitle').textContent = 'Painel administrador';
  }
  function summary() {
    $('selectedRoom').textContent=room;
    $('date').value=selected;
    const bookingInfo = items.find(b => b.room === room && b.date === selected);
    const occupied = busy(selected);
    const sunday = isSunday(selected);
    const noticeEl = $('bookingNotice');
    if (!selected) {
      $('selectedDate').textContent='Escolha uma data no calendário';
      if (noticeEl) noticeEl.remove();
      return;
    }
    $('selectedDate').textContent=format(selected);
    if (occupied) {
      const details = (bookingInfo && staff())
        ? `<div id="bookingNotice" class="booking-notice occupied"><b>Data ocupada:</b><p><strong>Responsável:</strong> ${escape(bookingInfo.name)}<br><strong>Apartamento:</strong> ${escape(bookingInfo.apartment)} &nbsp;|&nbsp; <strong>Telefone:</strong> ${escape(bookingInfo.phone)}<br><strong>Evento:</strong> ${escape(bookingInfo.event)}</p></div>`
        : `<div id="bookingNotice" class="booking-notice occupied"><b>Data ocupada</b><p>Este salão já possui uma reserva confirmada para esta data.</p></div>`;
      if (noticeEl) noticeEl.outerHTML = details;
      else $('selectedDate').insertAdjacentHTML('afterend', details);
    } else if (sunday) {
      const sat = getPreviousSaturday(selected);
      const satOccupied = busy(sat);
      const satMsg = sat > today() && !satOccupied
        ? `<br><button type="button" class="btn-select-sat" id="selectSatBtn" data-date="${sat}">📅 Reservar sábado (${format(sat)})</button>`
        : '';
      const details = `<div id="bookingNotice" class="booking-notice sunday-alert"><b>⚠️ Domingo indisponível para reservas</b><p>A zeladoria só fará a limpeza na segunda-feira.<br><strong>Dica:</strong> Alugue no sábado para utilizar no sábado e domingo.${satMsg}</p></div>`;
      if (noticeEl) noticeEl.outerHTML = details;
      else $('selectedDate').insertAdjacentHTML('afterend', details);
      if ($('selectSatBtn')) {
        $('selectSatBtn').onclick = () => {
          selected = sat;
          summary();
          renderCalendar();
        };
      }
    } else {
      if (noticeEl) noticeEl.remove();
    }
  }
  function renderRooms() {
    $('rooms').innerHTML=rooms.map(r=>`<button type="button" class="room ${room===r.name?'selected':''}" aria-pressed="${room===r.name}" data-room="${r.name}"><img class="room-img" src="https://images.unsplash.com/${r.image}?auto=format&fit=crop&w=900&q=80" alt="Imagem ilustrativa do salão ${r.name}"><div class="room-body"><div class="room-name">${r.name}</div><div class="room-desc">${r.desc}</div><div class="room-meta"><span>Salão de festas</span><span>até ${r.capacity} pessoas</span></div></div></button>`).join('');
    $('rooms').querySelectorAll('button').forEach(button=>button.onclick=()=>{room=button.dataset.room;renderRooms();renderCalendar();summary();});
  }
  function renderCalendar() {
    const y=month.getFullYear(), m=month.getMonth(), label=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'});
    $('monthLabel').textContent=label.format(month);
    $('monthSelect').replaceChildren();
    for(let i=-1;i<=11;i++){const d=new Date(y,m+i,1), option=document.createElement('option');option.value=`${d.getFullYear()}-${d.getMonth()}`;option.textContent=label.format(d);option.selected=i===0;$('monthSelect').append(option);}
    let html='<div class="day blank"></div>'.repeat(new Date(y,m,1).getDay());
    for(let n=1;n<=new Date(y,m+1,0).getDate();n++){
      const date=`${y}-${String(m+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
      const dayOfWeek = new Date(y,m,n).getDay();
      const sunday = dayOfWeek === 0;
      const occupied = busy(date);
      const disabled = !loaded || date<=today();
      const tip = sunday
        ? 'Domingos não estão disponíveis para reserva (a zeladoria só fará a limpeza na segunda-feira). Alugue no sábado para usar sábado e domingo.'
        : occupied
        ? `${format(date)}, ocupado`
        : `${format(date)}, disponível`;
      
      html+=`<button type="button" class="day ${disabled?'disabled':''} ${sunday?'sunday-day':''} ${occupied?'occupied-day':''} ${selected===date?'selected':''}" data-date="${date}" data-sunday="${sunday}" title="${escape(tip)}" aria-label="${escape(tip)}" ${disabled?'disabled':''}>
        <span>${n}</span>
        ${sunday ? '<small class="dom-tag" title="Zeladoria limpa na segunda">Dom</small>' : ''}
        <span class="status" style="background:${occupied?'var(--red)':sunday?'#d97706':disabled?'var(--muted)':'var(--green)'}"></span>
      </button>`;
    }
    $('days').innerHTML=html;$('date').min=tomorrow();
    $('days').querySelectorAll('button:not(:disabled)').forEach(button=>button.onclick=()=>{selected=button.dataset.date;summary();renderCalendar();});
  }
  async function deleteBooking(roomName, bookingDate) {
    if (!confirm(`Deseja realmente cancelar/excluir a reserva de ${roomName} em ${format(bookingDate)}?`)) return;
    try {
      await send('bookings', 'DELETE', { room: roomName, date: bookingDate });
      show('Reserva excluída com sucesso.');
      await loadBookings();
    } catch (err) {
      show(err.message);
    }
  }
  function renderFullReservations() {
    const container = $('fullReservationCards');
    if (!container) return;
    const query = ($('reservationSearch')?.value || '').trim().toLowerCase();
    const roomFilter = $('roomFilter')?.value || '';
    const filtered = items.filter(b => {
      if (roomFilter && b.room !== roomFilter) return false;
      if (!query) return true;
      const haystack = `${b.name||''} ${b.apartment||''} ${b.phone||''} ${b.event||''} ${b.room||''} ${b.date||''} ${format(b.date)}`.toLowerCase();
      return haystack.includes(query);
    });
    if (!filtered.length) {
      container.innerHTML = `<div class="empty" style="grid-column:1/-1;padding:40px 10px;font-size:15px">Nenhuma reserva ${query || roomFilter ? 'encontrada com os filtros aplicados' : 'registrada'}.</div>`;
      return;
    }
    container.innerHTML = filtered.map(b => {
      const canCancel = user && (user.role === 'admin' || b.user === user.id);
      return `
      <article class="res-card">
        <div class="res-card-header">
          <span class="res-card-room">${escape(b.room)}</span>
          <span class="res-card-date">${escape(formatWithWeekday(b.date))}</span>
          <span class="pill-confirmed">Confirmada</span>
        </div>
        <div class="res-card-body">
          <div class="res-card-main">
            <span class="res-card-label">Responsável pelo evento</span>
            <div class="res-card-name">${escape(b.name || 'Não informado')}</div>
          </div>
          <div class="res-card-grid">
            <div>
              <span class="res-card-label">Apartamento</span>
              <strong class="res-card-val">${escape(b.apartment || 'N/A')}</strong>
            </div>
            <div>
              <span class="res-card-label">Telefone</span>
              <strong class="res-card-val">${escape(b.phone || 'N/A')}</strong>
            </div>
            <div>
              <span class="res-card-label">Tipo de evento</span>
              <strong class="res-card-val">${escape(b.event || 'Evento')}</strong>
            </div>
            <div>
              <span class="res-card-label">Horário</span>
              <strong class="res-card-val">${escape(b.start || '10:00')} às ${escape(b.end || '22:00')}</strong>
            </div>
          </div>
          ${canCancel ? `<button type="button" class="btn-cancel-booking" data-room="${escape(b.room)}" data-date="${escape(b.date)}">🗑️ Excluir reserva</button>` : ''}
        </div>
      </article>
    `;
    }).join('');
    container.querySelectorAll('.btn-cancel-booking').forEach(btn => {
      btn.onclick = () => deleteBooking(btn.dataset.room, btn.dataset.date);
    });
  }
  function renderReservations() {
    $('reservationList').innerHTML=items.length?items.map(b=>{
      const canCancel = user && (user.role === 'admin' || b.user === user.id);
      return `<div class="reservation"><div><div class="res-date">${escape(format(b.date))} — <span class="badge" style="vertical-align:middle">${escape(b.room)}</span></div><div class="res-detail">${escape(b.event)} · ${escape(b.start)}–${escape(b.end)}${staff()?`<br><strong>Responsável:</strong> ${escape(b.name)} &nbsp;|&nbsp; <strong>Apartamento:</strong> ${escape(b.apartment)} &nbsp;|&nbsp; <strong>Telefone:</strong> ${escape(b.phone)}`:''}</div>${canCancel ? `<button type="button" class="btn-cancel-booking" data-room="${escape(b.room)}" data-date="${escape(b.date)}" style="margin-top:6px">Excluir</button>` : ''}</div><span class="pill">Solicitada</span></div>`;
    }).join(''):'<div class="empty">Nenhuma reserva registrada.</div>';
    
    $('reservationList').querySelectorAll('.btn-cancel-booking').forEach(btn => {
      btn.onclick = () => deleteBooking(btn.dataset.room, btn.dataset.date);
    });

    $('adminReservations').innerHTML=staff()?items.map(b=>`<div class="admin-reservation"><div style="display:flex;justify-content:space-between;align-items:center"><b>${escape(b.room)} · ${escape(format(b.date))}</b><span class="badge">${escape(b.event)}</span></div><div style="margin-top:6px;font-size:14px"><strong>Responsável:</strong> ${escape(b.name)}<br><strong>Apartamento:</strong> ${escape(b.apartment)} &nbsp;|&nbsp; <strong>Telefone:</strong> ${escape(b.phone)}</div><button type="button" class="btn-cancel-booking" data-room="${escape(b.room)}" data-date="${escape(b.date)}" style="margin-top:8px">Excluir reserva</button></div>`).join(''):'';
    
    $('adminReservations').querySelectorAll('.btn-cancel-booking').forEach(btn => {
      btn.onclick = () => deleteBooking(btn.dataset.room, btn.dataset.date);
    });

    $('bookingCount').textContent=items.length;
    renderFullReservations();
  }
  async function loadBookings() { const data=await api('bookings'); items=data.bookings; availability=data.availability; loaded=true;renderCalendar();renderReservations();summary(); }
  async function loadTerm() { const data=await api('settings');term=data.term;$('termEditor').value=term;document.querySelector('#termsModal .terms').textContent=term; }
  async function loadAccounts() {
    const {accounts}=await api('accounts');$('accountCount').textContent=accounts.length;
    $('accountList').innerHTML=accounts.map(a=>`<div class="account"><div><b>${escape(a.name)}</b><small>${escape(a.id)}</small></div><div style="display:flex;align-items:center;gap:8px"><span class="badge">${a.role==='admin'?'Administrador':a.role==='portaria'?'Portaria':'Morador'}</span>${a.id!==user.id?`<button type="button" class="btn-delete-user" data-id="${escape(a.id)}" data-name="${escape(a.name)}" title="Excluir usuário" style="padding:4px 8px;font-size:13px;background:var(--red);border:none;border-radius:4px;color:white;cursor:pointer">🗑️</button>`:''}</div></div>`).join('');
    $('accountList').querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm(`Deseja realmente excluir o usuário "${btn.dataset.name}"?\n\nEsta ação não poderá ser desfeita.`)) return;
        try {
          await send('accounts', 'DELETE', { id: btn.dataset.id });
          show('Usuário excluído com sucesso.');
          await loadAccounts();
        } catch (err) {
          show(err.message);
        }
      };
    });
  }
  async function enter() {
    $('userLabel').textContent=user.name;$('avatar').textContent=(user.name||'M').charAt(0).toUpperCase();
    $('navAdmin').classList.toggle('hidden',user.role!=='admin');
    $('navReservationsLabel').textContent=staff()?'Reservas realizadas':'Minhas reservas';
    $('sideReservationsTitle').textContent=staff()?'Reservas realizadas':'Minhas reservas';
    $('sideReservationsSub').textContent=staff()?'Todas as reservas do condomínio.':'Solicitações feitas por você.';
    $('topbarEyebrow').textContent=staff()?(user.role==='admin'?'Administração':'Portaria'):'Área do morador';
    page('booking');
    $('name').value=user.name||'';$('apartment').value=user.apartment||'';$('phone').value=user.phone||'';
    $('loginView').classList.add('hidden');$('appView').classList.remove('hidden');
    if(user.mustChange){$('appView').classList.add('hidden');openPassword();return;}
    try { await Promise.all([loadBookings(),loadTerm()]); } catch(error) { show(error.message+' Use Atualizar para tentar novamente.'); }
  }
  $('name').insertAdjacentHTML('afterend','<div class="grid2"><div><label for="apartment">Apartamento</label><input id="apartment" maxlength="30" required></div><div><label for="phone">Telefone</label><input id="phone" type="tel" maxlength="30" required></div></div>');
  $('newName').insertAdjacentHTML('afterend','<label for="accountRole">Tipo de conta</label><select id="accountRole"><option value="resident">Morador</option><option value="portaria">Portaria</option></select>');
  $('accountRole').onchange=()=>{$('newCpf').required=$('accountRole').value==='resident';$('newCpf').disabled=!$('newCpf').required;};
  document.querySelector('#adminPage .admin').insertAdjacentHTML('beforeend','<section class="panel term-editor"><h3>Termo de responsabilidade</h3><textarea id="termEditor" aria-label="Texto do termo" maxlength="20000"></textarea><button class="primary" id="saveTerm">Salvar termo</button></section><section class="panel term-editor"><h3>Reservas realizadas</h3><div id="adminReservations"></div></section><section class="panel term-editor"><h3>Relatório Mensal de Reservas</h3><div style="margin-bottom:16px"><label for="reportMonth" style="display:block;margin-bottom:6px;font-weight:500">Selecione o mês:</label><div style="display:flex;gap:8px"><input type="month" id="reportMonth" style="padding:8px;border:1px solid var(--border);border-radius:4px;flex:1"><button class="primary" id="generateReport">Gerar relatório</button></div></div><div id="reportResult" style="display:none"><div style="margin-bottom:16px;padding:12px;background:var(--panel);border-radius:8px"><h4 style="margin:0 0 12px 0">Estatísticas do mês</h4><div id="reportStats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px"></div></div><div id="reportBookings"></div></div></section>');
  document.querySelector('.resident').insertAdjacentHTML('afterbegin','<button class="toolbar-button" id="themeToggle" aria-label="Alternar tema">Tema</button><button class="toolbar-button" id="refresh">Atualizar</button><button class="toolbar-button" id="changePassword">Alterar senha</button>');
  document.body.insertAdjacentHTML('beforeend','<div class="modal-back hidden" id="passwordModal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="passwordTitle"><h3 id="passwordTitle">Alterar senha</h3><form id="passwordForm"><div id="currentPasswordWrap"><label for="currentPassword">Senha atual</label><input id="currentPassword" type="password" autocomplete="current-password" maxlength="256"></div><label for="newPassword">Nova senha</label><input id="newPassword" type="password" autocomplete="new-password" minlength="8" maxlength="256" required><label for="confirmPassword">Confirmar nova senha</label><input id="confirmPassword" type="password" autocomplete="new-password" required><div class="error" id="passwordError" role="alert"></div><div class="modal-actions"><button type="button" class="secondary" id="cancelPassword">Cancelar</button><button class="primary" type="submit">Salvar senha</button></div></form></section></div><div class="modal-back hidden" id="credentialModal"><section class="modal" role="dialog" aria-modal="true" aria-label="Conta criada"><h3>Conta criada</h3><p>Entregue esta senha temporária ao titular por um canal privado. Ela é exibida apenas agora e deverá ser trocada no primeiro acesso.</p><p class="credential" id="credentialValue"></p><button class="primary" id="closeCredential">Concluir</button></section></div>');
  function openPassword() {$('passwordForm').reset();$('passwordError').textContent='';$('currentPasswordWrap').classList.toggle('hidden',!!user.mustChange);$('currentPassword').required=!user.mustChange;$('cancelPassword').textContent=user.mustChange?'Sair':'Cancelar';$('passwordTitle').textContent=user.mustChange?'Crie sua nova senha':'Alterar senha';$('passwordModal').classList.remove('hidden');(user.mustChange?$('newPassword'):$('currentPassword')).focus();}
  $('loginForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;$('loginError').textContent='';try{const data=await send('login','POST',{identifier:$('loginId').value.trim(),password:$('loginPass').value});user=data.user;$('loginPass').value='';await enter();}catch(error){$('loginError').textContent=error.message;}finally{button.disabled=false;}};
  async function logout(){try{await api('login',{method:'DELETE'});resetSession();$('loginId').focus();}catch(error){show(error.message);}}
  $('logout').onclick=logout;$('changePassword').onclick=openPassword;
  $('cancelPassword').onclick=()=>{if(user.mustChange)logout();else{$('passwordModal').classList.add('hidden');$('changePassword').focus();}};
  $('passwordForm').onsubmit=async e=>{e.preventDefault();if($('newPassword').value!==$('confirmPassword').value){$('passwordError').textContent='As senhas não coincidem.';return;}const button=e.submitter;button.disabled=true;try{await send('password','PATCH',{password:$('newPassword').value,currentPassword:$('currentPassword').value});user.mustChange=false;$('passwordForm').reset();$('passwordModal').classList.add('hidden');await enter();show('Senha atualizada.');}catch(error){$('passwordError').textContent=error.message;}finally{button.disabled=false;}};
  $('navBooking').onclick=()=>page('booking');
  $('navReservations').onclick=()=>{page('reservations');renderFullReservations();};
  $('navAdmin').onclick=async()=>{if(user?.role!=='admin')return;page('admin');try{await Promise.all([loadAccounts(),loadBookings(),loadTerm()]);}catch(error){show(error.message);}};
  $('refresh').onclick=async()=>{try{await Promise.all([loadBookings(),loadTerm()]);show('Dados atualizados.');}catch(error){show(error.message);}};
  $('reservationSearch').oninput=()=>renderFullReservations();
  $('roomFilter').onchange=()=>renderFullReservations();
  if ($('clearAllBookingsBtn')) {
    $('clearAllBookingsBtn').onclick = async () => {
      if (!confirm('ATENÇÃO: Deseja realmente excluir TODAS as reservas do sistema? Esta ação limpará as reservas de teste e não poderá ser desfeita.')) return;
      try {
        const data = await send('bookings', 'DELETE', { all: true });
        show(`${data.deletedCount || 0} reservas excluídas com sucesso.`);
        await loadBookings();
      } catch (err) {
        show(err.message);
      }
    };
  }
  $('accountForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const data=await send('accounts','POST',{cpf:$('newCpf').value,name:$('newName').value,role:$('accountRole').value});$('credentialValue').textContent=data.temporaryPassword;$('credentialModal').classList.remove('hidden');$('closeCredential').focus();$('accountForm').reset();$('accountRole').onchange();await loadAccounts();}catch(error){show(error.message);}finally{button.disabled=false;}};
  $('closeCredential').onclick=()=>{$('credentialValue').textContent='';$('credentialModal').classList.add('hidden');$('newCpf').focus();};
  $('saveTerm').onclick=async()=>{const button=$('saveTerm');button.disabled=true;try{await send('settings','PATCH',{term:$('termEditor').value});await loadTerm();show('Termo atualizado.');}catch(error){show(error.message);}finally{button.disabled=false;}};
  $('generateReport').onclick=async()=>{const monthValue=$('reportMonth').value;if(!monthValue){show('Selecione um mês para gerar o relatório.');return;}const button=$('generateReport');button.disabled=true;try{const data=await api(`reports?month=${monthValue}`);const monthLabel=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(monthValue+'-15'));$('reportStats').innerHTML=`<div style="padding:8px;background:var(--bg);border-radius:4px"><strong style="display:block;font-size:20px;color:var(--primary)">${data.stats.total}</strong><span style="font-size:14px;color:var(--muted)">Total de reservas</span></div>`+Object.entries(data.stats.byRoom).map(([room,count])=>`<div style="padding:8px;background:var(--bg);border-radius:4px"><strong style="display:block;font-size:20px;color:var(--primary)">${count}</strong><span style="font-size:14px;color:var(--muted)">${escape(room)}</span></div>`).join('');$('reportBookings').innerHTML=data.bookings.length?`<h4 style="margin:16px 0 12px 0">Reservas de ${monthLabel}</h4>`+data.bookings.map(b=>`<div class="admin-reservation"><div style="display:flex;justify-content:space-between;align-items:center"><b>${escape(b.room)} · ${escape(format(b.date))}</b><span class="badge">${escape(b.event)}</span></div><div style="margin-top:6px;font-size:14px"><strong>Responsável:</strong> ${escape(b.name)}<br><strong>Apartamento:</strong> ${escape(b.apartment)} &nbsp;|&nbsp; <strong>Telefone:</strong> ${escape(b.phone)}</div></div>`).join(''):`<p style="color:var(--muted);text-align:center;padding:20px">Nenhuma reserva registrada em ${monthLabel}.</p>`;$('reportResult').style.display='block';show('Relatório gerado com sucesso.');}catch(error){show(error.message);}finally{button.disabled=false;}};
  $('start').innerHTML='<option>10:00</option>';$('end').innerHTML='<option>22:00</option>';$('start').disabled=true;$('end').disabled=true;
  $('date').onchange=()=>{
    selected=$('date').value;
    if(selected){
      month=new Date(selected+'T12:00:00');
      if(isSunday(selected)) {
        show('Aos domingos não é permitido reservar (limpeza na segunda). Sugerimos alugar no sábado.');
      }
    }
    summary();
    renderCalendar();
  };
  $('prev').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);renderCalendar();};$('next').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);renderCalendar();};
  $('monthSelect').onchange=()=>{const [y,m]=$('monthSelect').value.split('-');month=new Date(+y,+m,1);renderCalendar();};
  $('bookingForm').onsubmit=async e=>{
    e.preventDefault();
    selected=$('date').value;
    if(!loaded){show('Atualize o calendário antes de reservar.');return;}
    if(isSunday(selected)){show('Não são permitidas reservas aos domingos (a zeladoria só fará a limpeza na segunda-feira). Alugue no sábado.');return;}
    if(!selected||selected<=today()||busy(selected)){show('Escolha uma data futura disponível.');return;}
    const button=e.submitter;
    button.disabled=true;
    try{
      await loadTerm();
      $('acceptTerms').checked=false;
      $('termsModal').classList.remove('hidden');
      $('acceptTerms').focus();
    }catch(error){show(error.message);}
    finally{button.disabled=false;}
  };
  $('cancelTerms').onclick=()=>{if(!saving){$('termsModal').classList.add('hidden');$('bookingForm').querySelector('button').focus();}};
  $('signTerms').onclick=async()=>{if(saving)return;if(!$('acceptTerms').checked){show('Aceite o termo para continuar.');return;}saving=true;$('signTerms').disabled=true;try{await send('bookings','POST',{room,date:selected,start:'10:00',end:'22:00',event:$('event').value,name:$('name').value,apartment:$('apartment').value,phone:$('phone').value,acceptTerms:true});$('termsModal').classList.add('hidden');$('bookingForm').reset();$('acceptTerms').checked=false;selected='';summary();show('Reserva solicitada com sucesso.');try{await loadBookings();}catch(error){loaded=false;renderCalendar();show('Reserva salva. Atualize o calendário para consultar.');}}catch(error){show(error.message);}finally{saving=false;$('signTerms').disabled=false;}};
  function theme(dark){document.documentElement.dataset.theme=dark?'dark':'light';$('themeToggle').textContent=dark?'Tema claro':'Tema escuro';try{localStorage.setItem('ltTheme',dark?'dark':'light');}catch{}}
  let dark=false;try{dark=localStorage.getItem('ltTheme')==='dark';for(const key of ['ltAccounts','ltAdminPassword'])localStorage.removeItem(key);}catch{}theme(dark);$('themeToggle').onclick=()=>theme(document.documentElement.dataset.theme!=='dark');
  document.addEventListener('keydown',e=>{const modal=[...document.querySelectorAll('.modal-back:not(.hidden)')].at(-1);if(!modal)return;if(e.key==='Tab'){const controls=[...modal.querySelectorAll('button,input,textarea')].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}if(e.key==='Escape'){if(modal.id==='termsModal')$('cancelTerms').click();else if(modal.id==='passwordModal'&&!user?.mustChange)$('cancelPassword').click();}});
  $('adminRooms').innerHTML=rooms.map(r=>`<div class="account"><div><b>${r.name}</b><small>${r.desc}</small></div><span class="badge">Até ${r.capacity}</span></div>`).join('');
  renderRooms();renderCalendar();summary();
  (async () => {
    try {
      const data = await api('login');
      if (data && data.user) {
        user = data.user;
        await enter();
      }
    } catch {}
  })();
})();
