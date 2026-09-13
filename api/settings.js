const { getDb } = require('./_lib/db');
const { read, json, body, failure } = require('./_lib/security');

const defaultTerm = `Ao solicitar a reserva, declaro estar ciente de que sou responsável pela utilização do salão de festas selecionado, pelos convidados, pela conservação das instalações, móveis e equipamentos, bem como pelo cumprimento das regras do condomínio.\n\nComprometo-me a entregar o espaço nas condições em que o recebi, respeitar os horários autorizados e reparar eventuais danos causados durante o uso. A solicitação estará sujeita à análise e confirmação da administração do London Tower.`;

module.exports = async (req, res) => {
  try {
    if (!['GET','PATCH'].includes(req.method)) return json(res, 405, { error:'Método não permitido.' });
    const db = await getDb();
    const session = await read(req, db);
    if (!session) return json(res, 401, { error:'Sessão expirada.' });
    const settings = db.collection('settings');
    if (req.method === 'GET') {
      const item = await settings.findOne({ _id:'responsibility-term' });
      return json(res, 200, { term:item?.value || defaultTerm });
    }
    if (req.method === 'PATCH') {
      if (session.role !== 'admin' || session.mustChange) return json(res, 403, { error:'Apenas o administrador com senha atualizada pode editar o termo.' });
      const data = await body(req), term = String(data.term || '').trim();
      if (typeof data.term !== 'string' || term.length < 30 || term.length > 20000) return json(res, 400, { error:'O termo precisa ter entre 30 e 20000 caracteres.' });
      await settings.updateOne({ _id:'responsibility-term' }, { $set:{ value:term, updatedAt:new Date(), updatedBy:session.id } }, { upsert:true });
      return json(res, 200, { ok:true, term });
    }
    return json(res, 405, { error:'Método não permitido' });
  } catch (e) { return failure(res, e, 'Falha ao carregar o termo.'); }
};
