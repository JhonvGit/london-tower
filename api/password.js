const { getDb } = require('./_lib/db');
const { read, hashPassword, json, body } = require('./_lib/security');
module.exports = async (req, res) => {
  try {
    const session = read(req); if (!session || req.method !== 'PATCH') return json(res, 401, { error:'Sessão inválida.' });
    const { password } = await body(req); if (String(password||'').length < 8) return json(res, 400, { error:'A senha deve ter pelo menos 8 caracteres.' });
    await (await getDb()).collection('users').updateOne({ id:session.id }, { $set:{ passwordHash:hashPassword(String(password)), mustChange:false, updatedAt:new Date() } });
    return json(res, 200, { ok:true });
  } catch (e) { console.error(e); return json(res, 500, { error:'Falha ao atualizar a senha.' }); }
};
