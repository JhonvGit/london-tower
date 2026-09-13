const { getDb } = require('./_lib/db');
const { read, json, body } = require('./_lib/security');
module.exports = async (req, res) => {
  try {
    const session = read(req); if (!session) return json(res, 401, { error:'Sessão expirada.' });
    const bookings = (await getDb()).collection('bookings');
    if (req.method === 'GET') {
      const filter = session.role === 'admin' || session.role === 'portaria' ? {} : { user:session.id };
      return json(res, 200, { bookings:await bookings.find(filter).sort({createdAt:-1}).toArray() });
    }
    if (req.method === 'POST') {
      const data = await body(req);
      for (const key of ['room','date','start','end','name','apartment','phone']) if (!String(data[key]||'').trim()) return json(res, 400, { error:'Preencha todos os dados obrigatórios.' });
      const conflict = await bookings.findOne({ room:data.room, date:data.date });
      if (conflict) return json(res, 409, { error:'Esta data já está reservada.' });
      const item = { user:session.id, createdBy:session.id, room:String(data.room), date:String(data.date), start:String(data.start), end:String(data.end), event:String(data.event||'Outro'), name:String(data.name).trim(), apartment:String(data.apartment).trim(), phone:String(data.phone).trim(), signedAt:new Date(), signedBy:session.role };
      await bookings.insertOne(item); return json(res, 201, { booking:item });
    }
    return json(res, 405, { error:'Método não permitido' });
  } catch (e) { console.error(e); return json(res, 500, { error:'Falha ao processar reservas.' }); }
};
