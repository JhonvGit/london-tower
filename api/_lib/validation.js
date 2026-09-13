const ROOMS = ['Oxford', 'Napoli', 'Rooftop'];
function text(value, max = 200) { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max; }
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function today() { return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo' }).format(new Date()); }
function cpf(value) {
  if (typeof value !== 'string') return '';
  const id = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(id) || /^(\d)\1{10}$/.test(id)) return '';
  for (let size = 9; size <= 10; size++) {
    let sum = 0; for (let i = 0; i < size; i++) sum += Number(id[i]) * (size + 1 - i);
    if (Number(id[size]) !== (sum * 10 % 11) % 10) return '';
  }
  return id;
}
module.exports = { ROOMS, text, validDate, today, cpf };
