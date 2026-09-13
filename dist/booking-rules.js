(function(){
  const bookingFormEl=document.getElementById('bookingForm'),dateEl=document.getElementById('date'),startEl=document.getElementById('start'),endEl=document.getElementById('end'),eventEl=document.getElementById('event'),nameEl=document.getElementById('name'),apartmentEl=document.getElementById('apartment'),phoneEl=document.getElementById('phone'),termsModalEl=document.getElementById('termsModal'),acceptTermsEl=document.getElementById('acceptTerms'),signTermsEl=document.getElementById('signTerms');
  const tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  dateEl.min=tomorrow();
  startEl.innerHTML='<option value="10:00">10:00</option>';startEl.value='10:00';startEl.disabled=true;
  endEl.innerHTML='<option value="22:00">22:00</option>';endEl.value='22:00';endEl.disabled=true;
  const button=bookingFormEl.querySelector('button[type="submit"]');if(button)button.textContent='Reservar';
  bookingFormEl.noValidate=true;
  const baseCalendar=renderCalendar;
  renderCalendar=()=>{baseCalendar();document.querySelectorAll('.day:not(.blank)').forEach(day=>{if(day.dataset.date<tomorrow()){day.disabled=true;day.classList.add('disabled');day.querySelector('.status')?.style.setProperty('background','var(--muted)')}})};
  bookingFormEl.onsubmit=e=>{e.preventDefault();state.date=dateEl.value;if(!state.date||state.date<tomorrow()){show('Não é possível reservar hoje ou em datas anteriores. Escolha uma data futura.');return}if(!nameEl.value.trim()||!apartmentEl.value.trim()||!phoneEl.value.trim()){show('Preencha nome, apartamento e telefone.');return}termsModalEl.classList.remove('hidden')};
  signTermsEl.onclick=async()=>{if(!acceptTermsEl.checked){show('Marque a concordância com o termo para continuar.');return}try{await window.ltApi('/api/bookings',{method:'POST',body:JSON.stringify({room:state.room,date:state.date,start:'10:00',end:'22:00',event:eventEl.value,name:nameEl.value,apartment:apartmentEl.value,phone:phoneEl.value})});termsModalEl.classList.add('hidden');bookingFormEl.reset();startEl.value='10:00';endEl.value='22:00';dateEl.min=tomorrow();state.date='';await window.ltLoadBookings();updateSummary();show('Termo assinado e reserva solicitada.')}catch(err){show(err.message)}};
  renderCalendar();
})();
