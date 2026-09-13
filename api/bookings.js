const { getDb } = require('./_lib/db');
const { read, json, body, failure } = require('./_lib/security');
const { ROOMS, text, validDate, today } = require('./_lib/validation');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
  try {
    if (!['GET','POST','DELETE'].includes(req.method)) return json(res, 405, { error:'Método não permitido.' });
    const db = await getDb(), session = await read(req, db);
    if (!session) return json(res, 401, { error:'Sessão expirada.' });
    if (session.mustChange) return json(res, 403, { error:'Altere sua senha inicial antes de continuar.' });
    const bookings = db.collection('bookings');
    if (req.method === 'GET') {
      const isStaff = ['admin','portaria'].includes(session.role);
      const items = await bookings.find(isStaff ? {} : { user:session.id }).sort({createdAt:-1}).toArray();
      const availability = await bookings.find({ date:{ $gt:today() } }, { projection:{ _id:0, room:1, date:1 } }).toArray();
      return json(res, 200, { bookings:items, availability });
    }
    if (req.method === 'DELETE') {
      const data = await body(req).catch(() => ({}));
      if (data.all === true) {
        if (session.role !== 'admin') return json(res, 403, { error:'Apenas o administrador pode limpar todas as reservas.' });
        const result = await bookings.deleteMany({});
        return json(res, 200, { ok:true, deletedCount:result.deletedCount });
      }
      const filter = {};
      if (data.id) {
        try { filter._id = new ObjectId(String(data.id)); } catch { filter._id = data.id; }
      } else if (data.room && data.date) {
        filter.room = data.room;
        filter.date = data.date;
      } else {
        return json(res, 400, { error:'Informe a reserva a ser cancelada (id ou salão e data).' });
      }
      if (session.role !== 'admin') {
        filter.user = session.id;
      }
      const result = await bookings.deleteOne(filter);
      if (result.deletedCount === 0) return json(res, 404, { error:'Reserva não encontrada ou sem permissão para exclusão.' });
      return json(res, 200, { ok:true });
    }
    const data = await body(req);
    if (!ROOMS.includes(data.room) || !validDate(data.date)) return json(res, 400, { error:'Salão ou data inválidos.' });
    if (data.date <= today()) return json(res, 400, { error:'A reserva deve ser feita para uma data futura.' });
    if (data.start !== '10:00' || data.end !== '22:00') return json(res, 400, { error:'O horário permitido é das 10h às 22h.' });
    if (!text(data.name) || !text(data.apartment, 30) || !text(data.phone, 30) || (data.event !== undefined && !text(data.event, 100))) return json(res, 400, { error:'Preencha nome, apartamento, telefone e evento válidos.' });
    if (data.acceptTerms !== true) return json(res, 400, { error:'É necessário aceitar o termo de responsabilidade.' });
    // The unique index protects simultaneous requests on different server instances.
    await bookings.createIndex({ room:1, date:1 }, { unique:true });
    const item = { user:session.id, createdBy:session.id, room:data.room, date:data.date, start:data.start, end:data.end, event:data.event || 'Outro', name:data.name.trim(), apartment:data.apartment.trim(), phone:data.phone.trim(), signedAt:new Date(), createdAt:new Date(), signedBy:session.role };
    try { await bookings.insertOne(item); } catch (error) { if (error.code === 11000) return json(res, 409, { error:'Esta data já está reservada.' }); throw error; }
    return json(res, 201, { booking:item });
  } catch (error) { return failure(res, error, 'Falha ao processar reservas.'); }
};
