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
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  // O conector do MongoDB no Vercel fornece MONGODB_URI, mas não SESSION_SECRET.
  // Mantemos SESSION_SECRET como opção recomendada e usamos a URI como fallback
  // temporário para o ambiente já conectado.
  const secret = process.env.SESSION_SECRET || process.env.MONGODB_URI;
  if (!secret) throw new Error('MONGODB_URI não configurada');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function read(req) {
  const raw = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [body, sig] = raw.slice(COOKIE.length + 1).split('.');
  const secret = process.env.SESSION_SECRET || process.env.MONGODB_URI;
  if (!body || !sig || !secret) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { const data = JSON.parse(Buffer.from(body, 'base64url').toString()); return data.exp > Date.now() ? data : null; } catch { return null; }
}
function setCookie(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
}
function clearCookie(res) { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`); }
function json(res, status, body) { res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify(body)); }
async function body(req) { let raw=''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }

module.exports = { hashPassword, verifyPassword, sign, read, setCookie, clearCookie, json, body };
