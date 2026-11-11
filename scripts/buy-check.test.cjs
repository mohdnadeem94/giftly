const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');

// Load server modules with isolated API/DB mocks; never use credentials or real payments.
function load(file, mocks, env = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports, process: { env }, Date, Number, Set, Buffer, Request, Response, Headers, File, Uint8Array,
    console: { warn() {}, error() {}, info() {} },
    require(name) { assert.ok(name in mocks, `Unexpected dependency: ${name}`); return mocks[name]; },
  }, { filename: file });
  return module.exports;
}
const item = { externalId: 'same-product', merchant: 'old-store', productUrl: 'https://old.example/item', order: { totalCents: 2000 } };
function checker(product, env = {}, error = false) {
  let calls = 0;
  const helper = load('lib/buy-check.ts', { '@/lib/channel3': { async getGiftProduct(id) {
    calls++; assert.equal(id, item.externalId); if (error) throw Error('timeout'); return product;
  } } }, env);
  return { check: helper.checkBeforeBuy, calls: () => calls };
}
function product(cents = 2000, inStock = true) {
  return { id: item.externalId, priceCents: cents, inStock, merchant: 'new-store', productUrl: 'https://new.example/item' };
}
test('same price and cheaper preserve identity and refresh the selected store', async () => {
  for (const cents of [2000, 1900]) {
    const r = await checker(product(cents)).check(item);
    assert.equal(r.action, 'CHARGE'); assert.equal(r.cents, cents);
    assert.equal(r.merchant, 'new-store'); assert.equal(r.productUrl, 'https://new.example/item');
  }
});
test('higher price, null product, explicit sold-out, and unexpected identity block', async () => {
  assert.equal((await checker(product(2500)).check(item)).reason, 'PRICE_UP');
  for (const p of [null, product(1500, false), { ...product(), id: 'different-item' }]) {
    assert.equal((await checker(p).check(item)).reason, 'SOLD_OUT');
  }
});
test('unknown availability allows purchase; network errors use stored approved price', async () => {
  for (const availability of [null, undefined]) assert.equal((await checker(product(1900, availability)).check(item)).action, 'CHARGE');
  const r = await checker(null, {}, true).check(item);
  assert.equal(r.cents, 2000); assert.equal(r.merchant, 'old-store');
});
test('simulations work only outside production and never affect wishlist gifts', async () => {
  for (const [mode, action] of [['cheaper', 'CHARGE'], ['pricier', 'BLOCK'], ['soldout', 'BLOCK']]) {
    const c = checker(product(), { NODE_ENV: 'development', BUY_CHECK_SIMULATE: mode });
    const r = await c.check(item); assert.equal(r.action, action); assert.equal(c.calls(), 0);
    if (mode === 'cheaper') assert.equal(r.cents, 1900);
    if (mode === 'pricier') assert.equal(r.liveCents, 2500);
    assert.equal((await c.check({ ...item, externalId: null })).cents, 2000);
    const prod = checker(product(), { NODE_ENV: 'production', BUY_CHECK_SIMULATE: mode });
    assert.equal((await prod.check(item)).cents, 2000); assert.equal(prod.calls(), 1);
  }
});
test('Channel3 ranks available offers before sold-out and preserves unknown availability', () => {
  const { normalizeProduct } = load('lib/channel3.ts', { '@/lib/safety': { isUnsafeForChildren: () => false } });
  const offer = (price, availability) => ({ url: 'https://shop.example/item', domain: 'shop.example', price: { price, currency: 'USD' }, availability });
  const result = normalizeProduct({ id: 'a', title: 'Book', offers: [offer(1, 'out_of_stock'), offer(2)] });
  assert.equal(result.priceCents, 200); assert.equal(result.inStock, null);
  assert.equal(normalizeProduct({ id: 'a', title: 'Book', offers: [offer(2), offer(3, 'in_stock')] }).priceCents, 300);
});
function holdsHarness(env = {}) {
  const order = { id: 'order', totalCents: 2000, paymentState: 'AUTHORIZED', paypalAuthorizationId: 'auth', holdExpiresAt: new Date(Date.now() + 60000), authorizedCents: null };
  const captures = [], updates = [];
  const db = { $queryRaw: async () => [], order: { findUnique: async () => order, updateMany: async (args) => { updates.push(args); return { count: 1 }; } }, orderItem: { updateMany: async (args) => updates.push(args) } };
  db.$transaction = async (fn) => fn(db);
  const helper = load('lib/holds.ts', {
    '@prisma/client': { ItemStatus: { PAID: 'PAID' }, OrderStatus: {}, PaymentState: { AUTHORIZED: 'AUTHORIZED', CAPTURED: 'CAPTURED' } },
    '@/lib/db': { db }, '@/lib/paypal': { captureAuthorization: async (id, cents) => { captures.push(cents); return { ok: true, cents, status: 'COMPLETED' }; }, voidAuthorization: async () => true },
  }, env);
  return { ...helper, captures, updates, order };
}
test('capture validates amount before PayPal, updates price atomically and preserves the original hold', async () => {
  for (const bad of [0, -1, 2001, 1.5, NaN]) {
    const h = holdsHarness(); await assert.rejects(h.captureHold('order', bad)); assert.equal(h.captures.length, 0);
  }
  const h = holdsHarness(); await h.captureHold('order', 1900);
  assert.deepEqual(h.captures, [1900]); assert.equal(h.updates[0].data.totalCents, 1900);
  assert.equal(h.updates[0].data.authorizedCents, 2000); assert.equal(h.updates[1].data.priceAtPaymentCents, 1900);
});
test('Buy action blocks without capture, returns refreshed rows, and never retries a blocked gift', async () => {
  for (const reason of ['PRICE_UP', 'SOLD_OUT']) {
    let captures = 0, checks = 0;
    const row = { ...item, id: 'item', orderId: 'order', status: 'PAID', buyBlockedReason: null, proofs: [], order: { totalCents: 2000, paymentState: 'AUTHORIZED' } };
    const db = { orderItem: {
      findMany: async () => [row], update: async ({ data }) => Object.assign(row, data),
      updateMany: async () => { throw Error('Blocked gift must not advance'); },
    } };
    const { updateGiftStatus } = load('app/charity/actions.ts', {
      'next/server': { after() {} },
      '@prisma/client': { AdminDecision: {}, ItemStatus: { PAID: 'PAID' }, OrderStatus: { PAID: 'PAID' }, PaymentState: { AUTHORIZED: 'AUTHORIZED' } },
      '@/lib/db': { db }, '@/lib/charity-data': { getActingCharity: async () => ({ id: 'charity' }), giftRowSelect: {}, toGiftRow: (r) => r },
      '@/lib/gift-status': { GIFT_FLOW: ['PAID', 'BOUGHT', 'DELIVERED'], isAllowedTransition: (from, to) => from === 'PAID' && to === 'BOUGHT' },
      '@/lib/proof-check': { proofAllowsDelivery: () => false },
      '@/lib/holds': { HoldError: Error, captureHold: async () => captures++, releaseHold: async () => true },
      '@/lib/buy-check': { checkBeforeBuy: async () => { checks++; return { action: 'BLOCK', reason, liveCents: 2500 }; } },
      '@/lib/format': { money: (c) => `$${(c / 100).toFixed(2)}` }, '@/lib/thank-you': {},
    });
    const result = await updateGiftStatus(['item'], 'BOUGHT');
    assert.equal(result.ok, false); assert.equal(result.rows[0].buyBlockedReason, reason);
    assert.equal(captures, 0); assert.match(result.error, /hasn't been charged/);
    await updateGiftStatus(['item'], 'BOUGHT');
    assert.equal(captures, 0); assert.equal(checks, 1);
  }
});

module.exports = { load, holdsHarness };
