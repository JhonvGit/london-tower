const { getDb } = require('./_lib/db');
const { hashPassword, verifyPassword, createSession, setCookie, clearCookie, json, body } = require('./_lib/security');
const crypto = require('crypto');
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim(); }
function attemptKey(identifier, ip) { return crypto.createHash('sha256').update(`${String(identifier).toLowerCase()}|${ip}`).digest('hex'); }

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    const users = db.collection('users');
    await users.createIndex({ id: 1 }, { unique: true });
    await users.updateOne({ id: 'superlondon' }, { $setOnInsert: { id:'superlondon', name:'Administrador', role:'admin', passwordHash:hashPassword('102030'), mustChange:true, createdAt:new Date() } }, { upsert:true });
    await users.updateOne({ id: 'superportaria' }, { $setOnInsert: { id:'superportaria', name:'Super Portaria', role:'portaria', passwordHash:hashPassword('102030'), mustChange:true, createdAt:new Date() } }, { upsert:true });
    if (req.method === 'DELETE') { clearCookie(res); return json(res, 200, { ok:true }); }
    if (req.method !== 'POST') return json(res, 405, { error:'Método não permitido' });
    const { identifier, password } = await body(req);
    const id = String(identifier || '').trim();
    const attempts = db.collection('login_attempts');
    await attempts.createIndex({ expiresAt:1 }, { expireAfterSeconds:0 });
    const key = attemptKey(id, clientIp(req)), now = new Date();
    const record = await attempts.findOne({ _id:key });
    if (record && record.expiresAt > now && record.count >= MAX_ATTEMPTS) {
      const minutes = Math.max(1, Math.ceil((record.expiresAt-now)/60000));
      return json(res, 429, { error:`Muitas tentativas. Aguarde ${minutes} minuto(s) e tente novamente.` });
    }
    const user = await users.findOne({ $or:[{ id }, { id: id.replace(/\D/g,'') }] });
    if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
      const count = record && record.expiresAt > now ? record.count + 1 : 1;
      await attempts.updateOne({ _id:key }, { $set:{ count, expiresAt:new Date(Date.now()+WINDOW_MS) } }, { upsert:true });
      const remaining = Math.max(0, MAX_ATTEMPTS-count);
      return json(res, 401, { error:remaining?`CPF, usuário ou senha inválidos. Tentativas restantes: ${remaining}.`:'Muitas tentativas. Aguarde 15 minutos.' });
    }
    await attempts.deleteOne({ _id:key });
    setCookie(res, await createSession(db, { id:user.id, role:user.role }));
    return json(res, 200, { user:{ id:user.id, name:user.name, apartment:user.apartment||'', phone:user.phone||'', role:user.role, mustChange:!!user.mustChange } });
  } catch (e) { console.error(e); return json(res, 500, { error:'Falha ao conectar ao banco de dados.' }); }
};
