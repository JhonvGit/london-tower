const crypto = require('crypto');
const COOKIE = 'lt_session';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !/^[a-f0-9]{128}$/i.test(expected || '')) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
async function createSession(db, payload) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now()+28800000);
  const sessions = db.collection('sessions');
  await sessions.createIndex({ expiresAt:1 }, { expireAfterSeconds:0 });
  await sessions.insertOne({ tokenHash, ...payload, expiresAt, createdAt:new Date() });
  return token;
}
async function read(req, db) {
  const raw = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const token = raw.slice(COOKIE.length + 1);
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = await db.collection('sessions').findOne({ tokenHash, expiresAt:{ $gt:new Date() } });
  if (!session) return null;
  const user = await db.collection('users').findOne({ id:session.id });
  return user ? { ...session, role:user.role, mustChange:!!user.mustChange } : null;
}
async function revokeSession(req, db) {
  const raw = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
  if (raw) await db.collection('sessions').deleteOne({ tokenHash:crypto.createHash('sha256').update(raw.slice(COOKIE.length + 1)).digest('hex') });
}
function setCookie(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
}
function clearCookie(res) { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`); }
function json(res, status, body) { res.setHeader('Cache-Control', 'no-store'); res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify(body)); }
async function body(req) {
  let value = req.body;
  if (value === undefined) {
    const chunks = []; let size = 0;
    for await (const chunk of req) { const buffer = Buffer.from(chunk); size += buffer.length; if (size > 32768) throw Object.assign(new Error('Corpo da requisição muito grande.'), { status:413 }); chunks.push(buffer); }
    value = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(value)) value = value.toString('utf8');
  if (typeof value === 'string') {
    if (Buffer.byteLength(value) > 32768) throw Object.assign(new Error('Corpo da requisição muito grande.'), { status:413 });
    try { value = JSON.parse(value || '{}'); } catch { throw Object.assign(new Error('JSON inválido.'), { status:400 }); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('Informe um objeto JSON.'), { status:400 });
  return value;
}
function failure(res, error, message) { if (!error.status) console.error(message, error.name); return json(res, error.status || 500, { error:error.status ? error.message : message }); }

module.exports = { hashPassword, verifyPassword, createSession, read, revokeSession, setCookie, clearCookie, json, body, failure };
