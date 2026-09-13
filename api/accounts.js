const { getDb } = require('./_lib/db');
const { read, hashPassword, json, body, failure } = require('./_lib/security');
const { text, cpf } = require('./_lib/validation');
const crypto = require('crypto');
module.exports = async (req, res) => {
  try {
    if (!['GET','POST'].includes(req.method)) return json(res, 405, { error:'Método não permitido.' });
    const db = await getDb(), session = await read(req, db);
    if (!session || session.role !== 'admin') return json(res, 403, { error:'Acesso restrito.' });
    if (session.mustChange) return json(res, 403, { error:'Altere sua senha inicial antes de continuar.' });
    const users = db.collection('users');
    if (req.method === 'GET') return json(res, 200, { accounts:await users.find({}, { projection:{ passwordHash:0 } }).sort({createdAt:1}).toArray() });
    const data = await body(req);
    if (!['resident','portaria'].includes(data.role) || !text(data.name)) return json(res, 400, { error:'Informe nome e tipo de conta válidos.' });
    const id = data.role === 'portaria' ? 'superportaria' : cpf(data.cpf);
    if (!id) return json(res, 400, { error:'Informe um CPF válido.' });
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    await users.createIndex({ id:1 }, { unique:true });
    try { await users.insertOne({ id, name:data.name.trim(), role:data.role, passwordHash:hashPassword(temporaryPassword), mustChange:true, createdAt:new Date() }); }
    catch (error) { if (error.code === 11000) return json(res, 409, { error:'Esta conta já existe.' }); throw error; }
    return json(res, 201, { ok:true, temporaryPassword });
  } catch (error) { return failure(res, error, 'Falha ao processar contas.'); }
};
