const { getDb } = require('./_lib/db');
const { verifyPassword, createSession, revokeSession, setCookie, clearCookie, json, body, failure, read } = require('./_lib/security');
const crypto = require('crypto');
const WINDOW_MS = 15 * 60 * 1000;
module.exports = async (req, res) => {
  try {
    if (!['GET','POST','DELETE'].includes(req.method)) return json(res, 405, { error:'Método não permitido.' });
    const db = await getDb();
    if (req.method === 'GET') {
      const session = await read(req, db);
      if (!session) return json(res, 401, { error:'Não autenticado.' });
      const user = await db.collection('users').findOne({ id:session.id });
      if (!user) return json(res, 401, { error:'Usuário não encontrado.' });
      return json(res, 200, { user:{ id:user.id, name:user.name, apartment:user.apartment||'', phone:user.phone||'', role:user.role, mustChange:!!user.mustChange } });
    }
    if (req.method === 'DELETE') { await revokeSession(req, db); clearCookie(res); return json(res, 200, { ok:true }); }
    const { identifier, password } = await body(req);
    if (typeof identifier !== 'string' || typeof password !== 'string' || identifier.length > 100 || password.length > 256 || !identifier.trim() || !password) return json(res, 400, { error:'Informe usuário e senha válidos.' });
    const input = identifier.trim().toLowerCase();
    const id = /^[\d.\s-]+$/.test(input) ? input.replace(/\D/g,'') : input;
    const attempts = db.collection('login_attempts');
    await attempts.createIndex({ expiresAt:1 }, { expireAfterSeconds:0 });
    const key = crypto.createHash('sha256').update(id).digest('hex'), now = new Date();
    await attempts.deleteOne({ _id:key, expiresAt:{ $lte:now } });
    const update = { $inc:{ count:1 }, $setOnInsert:{ expiresAt:new Date(now.getTime()+WINDOW_MS) } };
    let record;
    try { record = await attempts.findOneAndUpdate({ _id:key }, update, { upsert:true, returnDocument:'after' }); }
    catch (error) { if (error.code !== 11000) throw error; record = await attempts.findOneAndUpdate({ _id:key }, { $inc:{ count:1 } }, { returnDocument:'after' }); }
    if (record.count > 5) { res.setHeader('Retry-After', String(Math.max(1, Math.ceil((record.expiresAt-now)/1000)))); return json(res, 429, { error:'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }); }
    const user = await db.collection('users').findOne({ id });
    if (!user || !verifyPassword(password, user.passwordHash)) return json(res, 401, { error:'CPF, usuário ou senha inválidos.' });
    if (verifyPassword('102030', user.passwordHash)) return json(res, 403, { error:'A senha inicial antiga foi desativada. Solicite uma nova senha à administração.' });
    await attempts.deleteOne({ _id:key });
    await revokeSession(req, db);
    setCookie(res, await createSession(db, { id:user.id, role:user.role }));
    return json(res, 200, { user:{ id:user.id, name:user.name, apartment:user.apartment||'', phone:user.phone||'', role:user.role, mustChange:!!user.mustChange } });
  } catch (error) { return failure(res, error, 'Falha ao efetuar login.'); }
};
