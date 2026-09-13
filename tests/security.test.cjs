const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { body, hashPassword, verifyPassword } = require('../api/_lib/security');
const { validDate, isSunday, cpf } = require('../api/_lib/validation');
test('password hashes reject incorrect passwords and malformed stored values without throwing', () => {
  const hash = hashPassword('long-enough-password');
  assert.equal(verifyPassword('long-enough-password', hash), true);
  assert.equal(verifyPassword('incorrect', hash), false);
  for (const value of ['', 'salt:ab', 'salt:zz', null]) assert.equal(verifyPassword('password', value), false);
});
test('JSON parser supports parsed bodies and preserves split UTF-8 characters', async () => {
  assert.deepEqual(await body({ body:{ name:'João' } }), { name:'João' });
  const raw = Buffer.from('{"name":"João"}');
  assert.deepEqual(await body(Readable.from([raw.subarray(0,12),raw.subarray(12)])), { name:'João' });
  assert.deepEqual(await body({ body:'{"ok":true}' }), { ok:true });
});
test('malformed, non-object and oversized JSON return client errors', async () => {
  for (const value of ['{', 'null', '[]']) await assert.rejects(body({ body:value }), { status:400 });
  await assert.rejects(body(Readable.from(['a'.repeat(32769)])), { status:413 });
});
test('dates and CPF require valid calendar dates and check digits', () => {
  assert.equal(validDate('2030-02-30'), false);assert.equal(validDate('2032-02-29'), true);
  assert.equal(validDate({ $gt:'' }), false);assert.equal(validDate('2030-99-99'), false);
  assert.equal(isSunday('2099-09-20'), true);assert.equal(isSunday('2099-09-19'), false);
  assert.equal(cpf('529.982.247-25'), '52998224725');assert.equal(cpf('11111111111'), '');assert.equal(cpf('52998224724'), '');
});
