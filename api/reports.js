const { getDb } = require('./_lib/db');
const { read, json, failure } = require('./_lib/security');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') return json(res, 405, { error:'Método não permitido.' });
    const db = await getDb(), session = await read(req, db);
    if (!session || session.role !== 'admin') return json(res, 403, { error:'Acesso restrito.' });
    if (session.mustChange) return json(res, 403, { error:'Altere sua senha inicial antes de continuar.' });
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const month = url.searchParams.get('month'); // formato: YYYY-MM
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return json(res, 400, { error:'Informe o mês no formato YYYY-MM.' });
    }
    
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().slice(0, 10); // último dia do mês
    
    const bookings = db.collection('bookings');
    const items = await bookings.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1, room: 1 }).toArray();
    
    // Estatísticas do mês
    const stats = {
      total: items.length,
      byRoom: {},
      byWeekday: {}
    };
    
    items.forEach(booking => {
      // Por salão
      if (!stats.byRoom[booking.room]) stats.byRoom[booking.room] = 0;
      stats.byRoom[booking.room]++;
      
      // Por dia da semana
      const date = new Date(booking.date + 'T12:00:00Z');
      const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).format(date);
      if (!stats.byWeekday[weekday]) stats.byWeekday[weekday] = 0;
      stats.byWeekday[weekday]++;
    });
    
    return json(res, 200, { 
      month,
      bookings: items,
      stats
    });
  } catch (error) { 
    return failure(res, error, 'Falha ao gerar relatório.'); 
  }
};
