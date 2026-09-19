'use strict';
const { getDb } = require('./_lib/db');
const { read, json, body, failure } = require('./_lib/security');

const defaultTerm = `Ao solicitar a reserva, declaro estar ciente de que sou responsável pela utilização do salão de festas selecionado, pelos convidados, pela conservação das instalações, móveis e equipamentos, bem como pelo cumprimento das regras do condomínio.\n\nComprometo-me a entregar o espaço nas condições em que o recebi, respeitar os horários autorizados e reparar eventuais danos causados durante o uso. A solicitação estará sujeita à análise e confirmação da administração do London Tower.`;

const defaultRooms = [
  { name: 'Oxford',  capacity: 40, image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80', desc: 'Ambiente acolhedor para comemorações e encontros.' },
  { name: 'Napoli',  capacity: 30, image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80', desc: 'Salão elegante para reuniões e celebrações menores.' },
  { name: 'Rooftop', capacity: 60, image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80', desc: 'Espaço amplo para eventos especiais com vista.' },
];

module.exports = async (req, res) => {
  try {
    if (!['GET', 'PATCH'].includes(req.method)) return json(res, 405, { error: 'Método não permitido.' });
    const db = await getDb();
    const session = await read(req, db);
    if (!session) return json(res, 401, { error: 'Sessão expirada.' });
    const settings = db.collection('settings');

    if (req.method === 'GET') {
      const [termDoc, roomDoc] = await Promise.all([
        settings.findOne({ _id: 'responsibility-term' }),
        settings.findOne({ _id: 'room-config' }),
      ]);
      return json(res, 200, {
        term: termDoc?.value || defaultTerm,
        rooms: roomDoc?.value || defaultRooms,
      });
    }

    // PATCH — apenas admin com senha atualizada
    if (req.method === 'PATCH') {
      if (session.role !== 'admin' || session.mustChange)
        return json(res, 403, { error: 'Apenas o administrador com senha atualizada pode editar as configurações.' });

      const data = await body(req);

      // --- Atualizar termo ---
      if (typeof data.term !== 'undefined') {
        const term = String(data.term || '').trim();
        if (typeof data.term !== 'string' || term.length < 30 || term.length > 20000)
          return json(res, 400, { error: 'O termo precisa ter entre 30 e 20000 caracteres.' });
        await settings.updateOne(
          { _id: 'responsibility-term' },
          { $set: { value: term, updatedAt: new Date(), updatedBy: session.id } },
          { upsert: true }
        );
        return json(res, 200, { ok: true, term });
      }

      // --- Atualizar config dos salões ---
      if (typeof data.rooms !== 'undefined') {
        if (!Array.isArray(data.rooms) || data.rooms.length === 0)
          return json(res, 400, { error: 'Lista de salões inválida.' });

        const validNames = defaultRooms.map(r => r.name);
        for (const r of data.rooms) {
          if (!validNames.includes(r.name))
            return json(res, 400, { error: `Salão desconhecido: ${r.name}` });
          const cap = Number(r.capacity);
          if (!Number.isInteger(cap) || cap < 1 || cap > 500)
            return json(res, 400, { error: `Capacidade inválida para ${r.name}. Use um número inteiro entre 1 e 500.` });
          if (typeof r.image !== 'string' || r.image.trim().length === 0)
            return json(res, 400, { error: `URL de imagem inválida para ${r.name}.` });
          // Aceita URL http/https ou caminhos relativos iniciando com /
          const imgUrl = r.image.trim();
          if (!/^https?:\/\//i.test(imgUrl) && !imgUrl.startsWith('/'))
            return json(res, 400, { error: `A imagem do salão ${r.name} deve ser uma URL (https://...) ou caminho relativo (/...).` });
        }

        const rooms = data.rooms.map(r => ({
          name: r.name,
          capacity: Number(r.capacity),
          image: r.image.trim(),
          desc: defaultRooms.find(d => d.name === r.name)?.desc || '',
        }));

        await settings.updateOne(
          { _id: 'room-config' },
          { $set: { value: rooms, updatedAt: new Date(), updatedBy: session.id } },
          { upsert: true }
        );
        return json(res, 200, { ok: true, rooms });
      }

      return json(res, 400, { error: 'Nenhum campo reconhecido para atualização.' });
    }

    return json(res, 405, { error: 'Método não permitido' });
  } catch (e) { return failure(res, e, 'Falha ao carregar as configurações.'); }
};
