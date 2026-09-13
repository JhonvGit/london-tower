const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve('.cache/mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { JSDOM } = require('jsdom');
const { getDb, closeDb } = require('../api/_lib/db');
const { hashPassword, createSession } = require('../api/_lib/security');
const handlers = Object.fromEntries(['login','password','bookings','accounts','settings'].map(name => [name, require('../api/'+name)]));
let server, db;
before(async () => { server=await MongoMemoryServer.create();process.env.MONGODB_URI=server.getUri();process.env.MONGODB_DB='test_london';db=await getDb(); });
after(async () => { await closeDb();if(server)await server.stop(); });
beforeEach(async () => { for(const name of ['users','sessions','bookings','login_attempts','settings'])await db.collection(name).deleteMany({}); });
async function call(name,method='GET',body={},cookie='') {
  const result={headers:{},status:0,data:null};
  const res={setHeader(key,value){result.headers[key]=value;return this;},status(value){result.status=value;return this;},end(value){result.data=JSON.parse(value);}};
  await handlers[name]({method,body,headers:{cookie}},res);return result;
}
async function account(id='resident',role='resident',mustChange=false) {
  await db.collection('users').insertOne({id,name:id,role,mustChange,passwordHash:hashPassword('initial-password')});
  return 'lt_session='+await createSession(db,{id,role});
}
const booking = overrides => ({room:'Oxford',date:'2099-09-15',start:'10:00',end:'22:00',event:'Aniversário',name:'Morador',apartment:'12',phone:'11999999999',acceptTerms:true,...overrides});
test('simultaneous bookings produce one reservation and one conflict in real MongoDB', async () => {
  const cookie=await account();
  const results=await Promise.all([call('bookings','POST',booking(),cookie),call('bookings','POST',booking(),cookie)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(await db.collection('bookings').countDocuments(),1);
  assert.ok((await db.collection('bookings').findOne()).createdAt instanceof Date);
});
test('availability includes other residents without their personal data', async () => {
  const alice=await account('alice'),bob=await account('bob');
  assert.equal((await call('bookings','POST',booking({name:'Private name'}),alice)).status,201);
  const result=await call('bookings','GET',{},bob);
  assert.equal(result.status,200);assert.deepEqual(result.data.bookings,[]);
  assert.deepEqual(result.data.availability,[{room:'Oxford',date:'2099-09-15'}]);
  assert.equal(result.headers['Cache-Control'],'no-store');
});
test('booking validation rejects impossible dates, query objects, missing consent and arbitrary rooms', async () => {
  const cookie=await account();
  for(const data of [{date:'2099-02-30'},{date:{$gt:''}},{room:'Unknown'},{acceptTerms:false},{start:'12:00'},{name:{$ne:null}},{date:'2000-01-01'}])assert.equal((await call('bookings','POST',booking(data),cookie)).status,400);
  assert.equal(await db.collection('bookings').countDocuments(),0);
});
test('DELETE booking allows resident to cancel own booking and admin to cancel any or clean all pentest bookings', async () => {
  const alice=await account('alice'), bob=await account('bob'), admin=await account('superlondon','admin');
  await call('bookings','POST',booking({room:'Oxford',date:'2099-09-15'}),alice);
  await call('bookings','POST',booking({room:'Napoli',date:'2099-09-16'}),bob);
  assert.equal(await db.collection('bookings').countDocuments(),2);

  // Bob cannot cancel Alice's booking
  assert.equal((await call('bookings','DELETE',{room:'Oxford',date:'2099-09-15'},bob)).status,404);
  // Alice can cancel her own booking
  assert.equal((await call('bookings','DELETE',{room:'Oxford',date:'2099-09-15'},alice)).status,200);
  assert.equal(await db.collection('bookings').countDocuments(),1);

  // Admin can clean all remaining bookings
  const cleanResult = await call('bookings','DELETE',{all:true},admin);
  assert.equal(cleanResult.status,200);
  assert.equal(cleanResult.data.deletedCount,1);
  assert.equal(await db.collection('bookings').countDocuments(),0);
});
test('first-access sessions cannot bypass password change or administrative permissions', async () => {
  const cookie=await account('admin','admin',true);
  assert.equal((await call('bookings','GET',{},cookie)).status,403);
  assert.equal((await call('accounts','GET',{},cookie)).status,403);
  assert.equal((await call('settings','PATCH',{term:'x'.repeat(40)},cookie)).status,403);
  const resident=await account('other');assert.equal((await call('accounts','GET',{},resident)).status,403);
});
test('logout revokes the server token, and expired sessions cannot be replayed', async () => {
  const cookie=await account();assert.equal((await call('login','DELETE',{},cookie)).status,200);
  assert.equal((await call('bookings','GET',{},cookie)).status,401);
  const expired=await account('expired');await db.collection('sessions').updateMany({id:'expired'},{$set:{expiresAt:new Date(0)}});
  assert.equal((await call('bookings','GET',{},expired)).status,401);
});
test('password change validates the old password and invalidates all previous sessions', async () => {
  const cookie=await account(), second='lt_session='+await createSession(db,{id:'resident',role:'resident'});
  assert.equal((await call('password','PATCH',{password:'different-password',currentPassword:'incorrect'},cookie)).status,400);
  const result=await call('password','PATCH',{password:'different-password',currentPassword:'initial-password'},cookie);
  assert.equal(result.status,200);assert.match(result.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Lax/);
  for(const old of [cookie,second])assert.equal((await call('bookings','GET',{},old)).status,401);
  const next=result.headers['Set-Cookie'].split(';')[0];assert.equal((await call('bookings','GET',{},next)).status,200);
});
test('first password change is allowed and clears the server restriction', async () => {
  const cookie=await account('new','resident',true);
  const result=await call('password','PATCH',{password:'different-password'},cookie);assert.equal(result.status,200);
  const next=result.headers['Set-Cookie'].split(';')[0];assert.equal((await call('bookings','GET',{},next)).status,200);
});
test('formatted CPF variants share the atomic login attempt limit', async () => {
  await account('52998224725');
  const responses=await Promise.all(Array.from({length:8},(_,i)=>call('login','POST',{identifier:i%2?'529.982.247-25':'52998224725',password:'wrong'})));
  assert.equal(responses.filter(r=>r.status===401).length,5);assert.equal(responses.filter(r=>r.status===429).length,3);
  assert.equal(await db.collection('login_attempts').countDocuments(),1);
});
test('login does not seed default accounts and handles normalized staff identifiers', async () => {
  assert.equal((await call('login','POST',{identifier:'superlondon',password:'102030'})).status,401);
  assert.equal(await db.collection('users').countDocuments(),0);
  await account('superportaria','portaria');
  assert.equal((await call('login','POST',{identifier:' SUPERPORTARIA ',password:'initial-password'})).status,200);
  await db.collection('users').updateOne({id:'superportaria'},{$set:{passwordHash:hashPassword('102030')}});
  assert.equal((await call('login','POST',{identifier:'superportaria',password:'102030'})).status,403);
});
test('account creation validates CPF and generates a unique temporary password', async () => {
  const cookie=await account('admin','admin');
  assert.equal((await call('accounts','POST',{cpf:'11111111111',name:'A',role:'resident'},cookie)).status,400);
  const result=await call('accounts','POST',{cpf:'529.982.247-25',name:'A',role:'resident'},cookie);
  assert.equal(result.status,201);assert.ok(result.data.temporaryPassword.length>=16);
  const login=await call('login','POST',{identifier:'52998224725',password:result.data.temporaryPassword});assert.equal(login.status,200);assert.equal(login.data.user.mustChange,true);
  const listed=await call('accounts','GET',{},cookie);assert.ok(listed.data.accounts.every(a=>!('passwordHash' in a)));
  assert.equal((await call('accounts','POST',{cpf:'529.982.247-25',name:'A',role:'resident'},cookie)).status,409);
});
test('unsupported methods and malformed payloads return client errors', async () => {
  for(const name of Object.keys(handlers))assert.equal((await call(name,'PUT')).status,405);
  const cookie=await account();assert.equal((await call('bookings','POST','{',cookie)).status,400);
});
test('setup migrates legacy passwords, preserves private passwords and is repeatable', async () => {
  await db.collection('users').insertOne({id:'legacy',role:'resident',passwordHash:hashPassword('102030')});
  await account('existing');const before=await db.collection('users').findOne({id:'existing'});
  const env={...process.env,BOOTSTRAP_ADMIN_PASSWORD:'test-bootstrap-password'};
  const {stdout}=await execFile(process.execPath,['scripts/setup.cjs'],{env});
  const credential=stdout.split(/\r?\n/).filter(line=>line.startsWith('{')).map(JSON.parse).find(item=>item.id==='legacy');
  assert.ok(credential.temporaryPassword.length>=16);
  assert.equal((await call('login','POST',{identifier:'legacy',password:credential.temporaryPassword})).status,200);
  assert.equal((await db.collection('users').findOne({id:'existing'})).passwordHash,before.passwordHash);
  await execFile(process.execPath,['scripts/setup.cjs'],{env});
  assert.equal(await db.collection('users').countDocuments({id:'superlondon'}),1);
});
test('GET login restores active session or returns 401 when absent', async () => {
  const cookie=await account('superlondon','admin');
  const authed=await call('login','GET',{},cookie);
  assert.equal(authed.status,200);assert.equal(authed.data.user.id,'superlondon');assert.equal(authed.data.user.role,'admin');
  const unauthed=await call('login','GET',{});
  assert.equal(unauthed.status,401);
});
async function until(fn) { for(let i=0;i<300;i++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('UI condition timed out'); }
function browser(initialCookie='') {
  const dom=new JSDOM(fs.readFileSync(path.resolve('dist/index.html'),'utf8'),{url:'https://london.test/',runScripts:'outside-only',pretendToBeVisual:true});
  let cookie=initialCookie;const {window}=dom;window.HTMLElement.prototype.scrollIntoView=function(){};
  window.fetch=async(url,options={})=>{const result=await call(url.split('/').at(-1),options.method||'GET',options.body?JSON.parse(options.body):{},cookie);if(result.headers['Set-Cookie'])cookie=result.headers['Set-Cookie'].split(';')[0];return{ok:result.status>=200&&result.status<300,status:result.status,json:async()=>result.data};};
  window.eval(fs.readFileSync(path.resolve('dist/portal.js'),'utf8'));
  const $=id=>window.document.getElementById(id);
  const submit=id=>$(id).dispatchEvent(new window.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:$(id).querySelector('button[type="submit"]')}));
  return{dom,window,$,submit};
}
test('portal automatically restores session on refresh/load when cookie is present', async () => {
  const cookie=await account('superlondon','admin');
  const {dom,$}=browser(cookie);
  try{
    await until(()=>$('appView').classList.contains('hidden')===false);
    assert.equal($('loginView').classList.contains('hidden'),true);
    assert.equal($('userLabel').textContent,'superlondon');
    assert.equal($('navAdmin').classList.contains('hidden'),false);
  }finally{dom.window.close();}
});
test('portal first-access flow works through the API and contains no local login fallback', async () => {
  await account('new','resident',true);const {dom,$,submit}=browser();
  try{
    $('loginId').value='new';$('loginPass').value='initial-password';submit('loginForm');await until(()=>$('passwordModal').classList.contains('hidden')===false);
    assert.equal($('appView').classList.contains('hidden'),true);
    $('newPassword').value='different-password';$('confirmPassword').value='different-password';submit('passwordForm');
    await until(()=>$('appView').classList.contains('hidden')===false&&$('days').querySelector('button:not(:disabled)'));
    assert.equal($('navAdmin').classList.contains('hidden'),true);
    $('changePassword').click();assert.equal($('currentPassword').required,true);$('cancelPassword').click();
    $('logout').click();await until(()=>$('loginView').classList.contains('hidden')===false);
    assert.equal(await db.collection('sessions').countDocuments({id:'new'}),0);
  }finally{dom.window.close();}
});
test('portal escapes stored markup and synchronizes typed booking dates with the summary', async () => {
  const cookie=await account('resident');await call('bookings','POST',booking({event:'<img src=x onerror=alert(1)>'}),cookie);
  const {dom,$,submit,window}=browser();
  try{
    $('loginId').value='resident';$('loginPass').value='initial-password';submit('loginForm');await until(()=>$('reservationList').textContent.includes('<img'));
    assert.equal($('reservationList').querySelector('img'),null);
    $('date').value='2099-09-16';$('date').dispatchEvent(new window.Event('change'));
    assert.match($('selectedDate').textContent,/16 de setembro de 2099/);
    $('name').value='Resident';$('apartment').value='12';$('phone').value='11999999999';submit('bookingForm');await until(()=>$('termsModal').classList.contains('hidden')===false);
    assert.equal($('acceptTerms').checked,false);$('acceptTerms').checked=true;$('signTerms').click();$('signTerms').click();
    await until(()=>$('termsModal').classList.contains('hidden')===true);
    assert.equal(await db.collection('bookings').countDocuments({date:'2099-09-16'}),1);
  }finally{dom.window.close();}
});
test('portaria and admin see responsible contact details, occupied date summary and dedicated reservations tab', async () => {
  const resident=await account('resident');await account('staff','portaria');
  await call('bookings','POST',booking({name:'Contato morador',apartment:'45B',phone:'11987654321',event:'Casamento',date:'2099-09-20'}),resident);
  const {dom,$,submit}=browser();
  try{
    $('loginId').value='staff';$('loginPass').value='initial-password';submit('loginForm');
    await until(()=>$('reservationList').textContent.includes('Contato morador'));
    assert.match($('reservationList').textContent,/11987654321/);assert.equal($('navAdmin').classList.contains('hidden'),true);
    
    // Dedicated reservations tab
    await $('navReservations').onclick();
    await until(()=>$('reservationsPage').classList.contains('hidden')===false && $('fullReservationCards').textContent.includes('Contato morador'));
    assert.equal($('bookingPage').classList.contains('hidden'),true);
    assert.match($('fullReservationCards').textContent,/Contato morador/);
    assert.match($('fullReservationCards').textContent,/45B/);
    assert.match($('fullReservationCards').textContent,/Casamento/);

    // Search filter
    $('reservationSearch').value = '45B';
    $('reservationSearch').dispatchEvent(new dom.window.Event('input'));
    assert.match($('fullReservationCards').textContent,/Contato morador/);

    $('reservationSearch').value = 'NenhumApto999';
    $('reservationSearch').dispatchEvent(new dom.window.Event('input'));
    assert.match($('fullReservationCards').textContent,/Nenhuma reserva/);

    const dayBtn=$('days').querySelector('[data-date="2099-09-20"]');
    if(dayBtn) {
      dayBtn.click();
      assert.match($('selectedDate').parentElement.textContent,/Contato morador/);
      assert.match($('selectedDate').parentElement.textContent,/45B/);
    }
  }finally{dom.window.close();}
});
