const { getDb } = require('./_lib/db');
const { read, hashPassword, json, body } = require('./_lib/security');
module.exports = async (req, res) => {
  try {
    const session = read(req); if (!session || session.role !== 'admin') return json(res, 403, { error:'Acesso restrito.' });
    const users = (await getDb()).collection('users');
    if (req.method === 'GET') return json(res, 200, { accounts:await users.find({}, { projection:{ passwordHash:0 } }).sort({createdAt:1}).toArray() });
    if (req.method === 'POST') {
      const data = await body(req), role = data.role === 'portaria' ? 'portaria' : 'resident';
      const id = role === 'portaria' ? 'superportaria' : String(data.cpf || '').replace(/\D/g,'');
      if ((role === 'resident' && id.length !== 11) || !String(data.name || '').trim()) return json(res, 400, { error:'Informe nome e CPF válidos.' });
      try { await users.insertOne({ id, name:String(data.name).trim(), role, apartment:String(data.apartment||'').trim(), phone:String(data.phone||'').trim(), passwordHash:hashPassword('102030'), mustChange:true, createdAt:new Date() }); } catch (e) { if (e.code === 11000) return json(res, 409, { error:'Esta conta já existe.' }); throw e; }
      return json(res, 201, { ok:true });
    }
    return json(res, 405, { error:'Método não permitido' });
  } catch (e) { console.error(e); return json(res, 500, { error:'Falha ao processar contas.' }); }
};
