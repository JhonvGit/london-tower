(function(){
  const tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  date.min=tomorrow();
  start.innerHTML='<option value="10:00">10:00</option>';start.value='10:00';start.disabled=true;
  end.innerHTML='<option value="22:00">22:00</option>';end.value='22:00';end.disabled=true;
  const button=bookingForm.querySelector('button[type="submit"]');if(button)button.textContent='Reservar';
  const baseCalendar=renderCalendar;
  renderCalendar=()=>{baseCalendar();document.querySelectorAll('.day:not(.blank)').forEach(day=>{if(day.dataset.date<tomorrow()){day.disabled=true;day.classList.add('disabled');day.querySelector('.status')?.style.setProperty('background','var(--muted)')}})};
  bookingForm.onsubmit=e=>{e.preventDefault();if(!state.date||state.date<tomorrow()){show('Não é possível reservar hoje ou em datas anteriores. Escolha uma data futura.');return}if(!name.value.trim()||!apartment.value.trim()||!phone.value.trim()){show('Preencha nome, apartamento e telefone.');return}termsModal.classList.remove('hidden')};
  signTerms.onclick=async()=>{if(!acceptTerms.checked){show('Marque a concordância com o termo para continuar.');return}try{await window.ltApi('/api/bookings',{method:'POST',body:JSON.stringify({room:state.room,date:state.date,start:'10:00',end:'22:00',event:event.value,name:name.value,apartment:apartment.value,phone:phone.value})});termsModal.classList.add('hidden');bookingForm.reset();start.value='10:00';end.value='22:00';date.min=tomorrow();state.date='';await window.ltLoadBookings();updateSummary();show('Termo assinado e reserva solicitada.')}catch(err){show(err.message)}};
  renderCalendar();
})();
