const crypto = require('crypto');
const COOKIE = 'lt_session';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
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
  return db.collection('sessions').findOne({ tokenHash, expiresAt:{ $gt:new Date() } }, { projection:{ _id:0, tokenHash:0 } });
}
function setCookie(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
}
function clearCookie(res) { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`); }
function json(res, status, body) { res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify(body)); }
async function body(req) { let raw=''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }

module.exports = { hashPassword, verifyPassword, createSession, read, setCookie, clearCookie, json, body };
