const { getDb } = require('./_lib/db');
const { read, hashPassword, verifyPassword, createSession, setCookie, json, body, failure } = require('./_lib/security');
module.exports = async (req, res) => {
  try {
    if (req.method !== 'PATCH') return json(res, 405, { error:'Método não permitido.' });
    const db = await getDb(), session = await read(req, db);
    if (!session) return json(res, 401, { error:'Sessão inválida.' });
    const { password, currentPassword } = await body(req);
    if (typeof password !== 'string' || password.length < 8 || password.length > 256) return json(res, 400, { error:'A senha deve ter entre 8 e 256 caracteres.' });
    const users = db.collection('users'), user = await users.findOne({ id:session.id });
    if (!session.mustChange && (typeof currentPassword !== 'string' || currentPassword.length > 256 || !verifyPassword(currentPassword, user.passwordHash))) return json(res, 400, { error:'Senha atual incorreta.' });
    if (verifyPassword(password, user.passwordHash)) return json(res, 400, { error:'Escolha uma senha diferente da atual.' });
    await users.updateOne({ id:session.id }, { $set:{ passwordHash:hashPassword(password), mustChange:false, updatedAt:new Date() } });
    await db.collection('sessions').deleteMany({ id:session.id });
    setCookie(res, await createSession(db, { id:session.id, role:session.role }));
    return json(res, 200, { ok:true });
  } catch (error) { return failure(res, error, 'Falha ao atualizar a senha.'); }
};
