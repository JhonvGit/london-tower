// Script to clean test/pentest bookings from MongoDB
const { getDb, closeDb } = require('../api/_lib/db');

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('Defina MONGODB_URI no ambiente antes de executar este script.');
    process.exitCode = 1;
    return;
  }
  const db = await getDb();
  const bookings = db.collection('bookings');
  const countBefore = await bookings.countDocuments();
  console.log(`Encontradas ${countBefore} reservas no banco de dados.`);
  
  if (countBefore === 0) {
    console.log('Nenhuma reserva para excluir.');
    return;
  }
  
  const result = await bookings.deleteMany({});
  console.log(`Sucesso: ${result.deletedCount} reservas foram excluídas do banco de dados.`);
})().catch(error => {
  console.error('Erro ao limpar reservas:', error.message);
  process.exitCode = 1;
}).finally(closeDb);
