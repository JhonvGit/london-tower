// Run explicitly against the intended database after a backup, before deployment.
const { getDb, closeDb } = require('../api/_lib/db');
const { hashPassword, verifyPassword } = require('../api/_lib/security');
const crypto = require('node:crypto');
(async () => {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!password || password.length < 12 || password.length > 256) throw new Error('Defina BOOTSTRAP_ADMIN_PASSWORD com 12 a 256 caracteres.');
  const db = await getDb(), users = db.collection('users'), bookings = db.collection('bookings');
  const duplicates = await bookings.aggregate([{ $group:{ _id:{ room:'$room',date:'$date' },count:{ $sum:1 } } }, { $match:{ count:{ $gt:1 } } }]).toArray();
  if (duplicates.length) throw new Error(`Existem ${duplicates.length} datas/salões duplicados. Resolva-os com a administração antes de executar novamente; nenhum registro foi excluído.`);
  await users.createIndex({ id:1 }, { unique:true });
  await bookings.createIndex({ room:1, date:1 }, { unique:true });
  await users.updateOne({ id:'superlondon' }, { $setOnInsert:{ id:'superlondon',name:'Administrador',role:'admin',passwordHash:hashPassword(password),mustChange:true,createdAt:new Date() } }, { upsert:true });
  // Rotate only the known compromised legacy default; preserve other passwords.
  for await (const user of users.find({})) {
    if (!verifyPassword('102030', user.passwordHash)) continue;
    const temporaryPassword = user.id === 'superlondon' ? password : crypto.randomBytes(12).toString('base64url');
    await users.updateOne({ _id:user._id, passwordHash:user.passwordHash }, { $set:{ passwordHash:hashPassword(temporaryPassword),mustChange:true } });
    await db.collection('sessions').deleteMany({ id:user.id });
    console.log(JSON.stringify({ id:user.id, temporaryPassword }));
  }
  console.log('Configuração concluída. Entregue as senhas temporárias por canal privado; não salve esta saída em logs públicos.');
})().catch(error => { console.error(error.message); process.exitCode=1; }).finally(closeDb);
