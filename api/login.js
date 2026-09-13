const { getDb } = require('./_lib/db');
const { hashPassword, verifyPassword, sign, setCookie, clearCookie, json, body } = require('./_lib/security');

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
    const user = await users.findOne({ $or:[{ id }, { id: id.replace(/\D/g,'') }] });
    if (!user || !verifyPassword(String(password || ''), user.passwordHash)) return json(res, 401, { error:'CPF, usuário ou senha inválidos.' });
    setCookie(res, sign({ id:user.id, role:user.role, exp:Date.now()+28800000 }));
    return json(res, 200, { user:{ id:user.id, name:user.name, apartment:user.apartment||'', phone:user.phone||'', role:user.role, mustChange:!!user.mustChange } });
  } catch (e) { console.error(e); return json(res, 500, { error:'Falha ao conectar ao banco de dados.' }); }
};
