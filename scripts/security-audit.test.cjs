const assert = require('node:assert/strict');
const test = require('node:test');
const { load, holdsHarness } = require('./buy-check.test.cjs');

test('expired/missing-expiry holds and charges above the original authorization never reach PayPal', async () => {
  for (const expires of [null, new Date(Date.now() - 1000)]) {
    const h = holdsHarness(); h.order.holdExpiresAt = expires;
    await assert.rejects(h.captureHold('order', 1900)); assert.equal(h.captures.length, 0);
  }
  const h = holdsHarness(); h.order.authorizedCents = 1800;
  await assert.rejects(h.captureHold('order', 1900)); assert.equal(h.captures.length, 0);
});
test('production ignores the test hold-duration override', () => {
  assert.equal(holdsHarness({ NODE_ENV: 'production', GIFT_HOLD_HOURS: '1' }).HOLD_HOURS, 72);
  assert.equal(holdsHarness({ NODE_ENV: 'development', GIFT_HOLD_HOURS: '1' }).HOLD_HOURS, 1);
});
function paypalHarness(capture) {
  let order;
  const sdk = { Client: class {}, Environment: { Sandbox: 'sandbox' }, CheckoutPaymentIntent: {},
    OrdersController: class { async getOrder() { return { result: order }; } },
    PaymentsController: class {
      async captureAuthorizedPayment(args) {
        assert.equal(args.body.finalCapture, true);
        assert.match(args.paypalRequestId, /-1900$/);
        return { result: { id: 'capture' } };
      }
      async getCapturedPayment() { return { result: capture }; }
    },
  };
  return { ...load('lib/paypal.ts', { '@paypal/paypal-server-sdk': sdk }, { PAYPAL_CLIENT_ID: 'test-id', PAYPAL_CLIENT_SECRET: 'test-only' }), setOrder: (value) => order = value };
}
test('PayPal capture must be completed, USD, and exactly the requested amount', async () => {
  for (const [status, currency, amount, ok] of [
    ['COMPLETED', 'USD', '19.00', true], ['PENDING', 'USD', '19.00', false],
    ['COMPLETED', 'EUR', '19.00', false], ['COMPLETED', 'USD', '20.00', false],
  ]) {
    const p = paypalHarness({ status, amount: { currencyCode: currency, value: amount } });
    assert.equal((await p.captureAuthorization('auth', 1900)).ok, ok);
  }
});
test('payment parser rejects partial strings, zero, negative, and non-cent amounts', () => {
  const p = paypalHarness({});
  for (const value of ['19.00junk', '-1.00', '0.00', '1.001', 'Infinity']) assert.equal(Number.isNaN(p.valueToCents(value)), true);
  assert.equal(p.valueToCents('19.00'), 1900);
});
test('order verification rejects expired authorizations and multiple purchase units', async () => {
  const p = paypalHarness({});
  const unit = { customId: 'giftly:item:item', payments: { authorizations: [{ id: 'auth', status: 'CREATED', expirationTime: new Date(Date.now() - 1000).toISOString(), amount: { currencyCode: 'USD', value: '20.00' } }] } };
  p.setOrder({ status: 'COMPLETED', intent: 'AUTHORIZE', purchaseUnits: [unit] });
  assert.equal(await p.verifyPayPalOrder('order'), null);
  unit.payments.authorizations[0].expirationTime = new Date(Date.now() + 60000).toISOString();
  assert.equal((await p.verifyPayPalOrder('order')).cents, 2000);
  p.setOrder({ status: 'COMPLETED', intent: 'AUTHORIZE', purchaseUnits: [unit, unit] });
  assert.equal(await p.verifyPayPalOrder('order'), null);
});
const next = { NextResponse: { json: (body, opts) => Response.json(body, opts) } };
test('cron rejects missing, wrong and unconfigured secrets before releasing anything', async () => {
  for (const secret of [undefined, 'test-only']) {
    let calls = 0;
    const route = load('app/api/cron/release-holds/route.ts', {
      'next/server': next, '@/lib/holds': { HOLD_HOURS: 72, releaseExpiredHolds: async () => { calls++; return 0; } },
    }, { CRON_SECRET: secret });
    for (const value of [undefined, 'Bearer incorrect']) {
      const response = await route.POST(new Request('https://example.test', { method: 'POST', headers: value ? { authorization: value } : {} }));
      assert.equal(response.status, secret ? 401 : 503); assert.equal(calls, 0);
    }
    if (secret) {
      assert.equal((await route.POST(new Request('https://example.test', { method: 'POST', headers: { authorization: `Bearer ${secret}` } }))).status, 200);
      assert.equal(calls, 1);
    }
  }
});
test('reset rejects missing/wrong passcodes even if the caller claims an Admin role', async () => {
  let calls = 0;
  const route = load('app/api/admin/reset/route.ts', {
    'next/server': next, '@/lib/db': { db: { order: { count: async () => 0 } } }, '@/lib/seed': { resetAndSeed: async () => { calls++; return {}; } },
  }, { ADMIN_PASSCODE: 'test-only' });
  for (const headers of [{}, { cookie: 'giftly_role=admin' }, { 'x-admin-passcode': 'wrong' }]) {
    assert.equal((await route.POST(new Request('https://example.test', { method: 'POST', headers }))).status, 403);
  }
  assert.equal(calls, 0);
  assert.equal((await route.POST(new Request('https://example.test', { method: 'POST', headers: { 'x-admin-passcode': 'test-only' } }))).status, 200);
});
test('public donor labels honor Anonymous and hide contact details', () => {
  const { publicDonorLabel: label } = load('lib/donor-label.ts', {});
  assert.equal(label({ displayName: 'Private name', anonymous: true }), 'Anonymous');
  for (const name of ['donor@example.test', '+1 (555) 123-4567']) assert.equal(label({ displayName: name, anonymous: false }), 'Donor');
  assert.equal(label({ displayName: 'Kind donor', anonymous: false }), 'Kind donor');
  assert.equal(label(null), 'Guest');
});
test('cash spec resolves its charge from the database snapshot rather than supplied cents', async () => {
  const { resolveGiving } = load('lib/giving.ts', { '@prisma/client': { NeedStatus: {} }, '@/lib/db': { db: {
    order: { findUnique: async () => ({ type: 'CASH', status: 'PENDING', totalCents: 1500, charityId: 'charity' }) },
    charity: { findUnique: async () => ({ id: 'charity', name: 'Cause' }) },
  } } });
  const resolved = await resolveGiving({ kind: 'cash', charityId: 'forged', cents: 1, orderId: 'draft' });
  assert.equal(resolved.amountCents, 1500); assert.equal(resolved.charityId, 'charity');
});
test('uploads reject unauthorized callers, oversized bodies and fake PNGs, and scope valid images to the acting charity', async () => {
  let charity = null, query;
  const route = load('app/api/proofs/route.ts', {
    'next/server': next, '@prisma/client': { ItemStatus: {}, OrderStatus: { PAID: 'PAID' }, PaymentState: { CAPTURED: 'CAPTURED' }, ProofResult: {} },
    '@/lib/db': { db: { orderItem: { findFirst: async (args) => { query = args; return null; } } } },
    '@/lib/charity-data': { getActingCharity: async () => charity }, '@/lib/proof-check': {},
  });
  assert.equal((await route.POST(new Request('https://example.test', { method: 'POST' }))).status, 403);
  charity = { id: 'own-charity' };
  assert.equal((await route.POST(new Request('https://example.test', { method: 'POST', headers: { 'content-length': '9999999' } }))).status, 413);
  for (const [bytes, expected] of [[new Uint8Array([0x89,0x50,0x4e,0x47,0,0,0,0,0]),415], [new Uint8Array([0xff,0xd8,0xff,0]),404]]) {
    const form = new FormData(); form.set('itemId', 'other-charity-item'); form.set('file', new File([bytes], 'receipt.png', { type: 'image/png' }));
    assert.equal((await route.POST(new Request('https://example.test', { method: 'POST', body: form }))).status, expected);
  }
  assert.equal(query.where.order.charityId, 'own-charity');
  assert.equal(query.where.order.paymentState, 'CAPTURED');
});
const actionMocks = (rows) => {
  let writes = 0;
  const { updateGiftStatus } = load('app/charity/actions.ts', {
    'next/server': { after() {} },
    '@prisma/client': { AdminDecision: { APPROVED: 'APPROVED' }, ItemStatus: { PAID: 'PAID', BOUGHT: 'BOUGHT' }, OrderStatus: { PAID: 'PAID' }, PaymentState: { AUTHORIZED: 'AUTHORIZED', CAPTURED: 'CAPTURED' } },
    '@/lib/db': { db: { orderItem: { findMany: async () => rows, updateMany: async () => { writes++; return { count: 1 }; } } } },
    '@/lib/charity-data': { getActingCharity: async () => ({ id: 'own-charity' }), giftRowSelect: {}, toGiftRow: (r) => r },
    '@/lib/gift-status': { GIFT_FLOW: ['PAID', 'BOUGHT', 'DELIVERED'], isAllowedTransition: (from, to) => (from === 'PAID' && to === 'BOUGHT') || (from === 'BOUGHT' && to === 'DELIVERED') },
    '@/lib/proof-check': { proofAllowsDelivery: (proof) => proof?.adminDecision === 'APPROVED' || (proof?.aiResult === 'MATCH' && proof?.adminDecision !== 'REJECTED') },
    '@/lib/holds': { HoldError: Error, captureHold: async () => { throw Error('Must not capture'); } },
    '@/lib/buy-check': {}, '@/lib/format': {}, '@/lib/thank-you': {},
  });
  return { updateGiftStatus, writes: () => writes };
};
test('status changes reject skipped steps, voided purchases, held deliveries and missing/rejected proofs', async () => {
  for (const [status, paymentState, proofs, target] of [
    ['PAID','VOIDED',[],'BOUGHT'], ['PAID','CAPTURED',[],'DELIVERED'],
    ['BOUGHT','AUTHORIZED',[{ id: 'proof', aiResult: 'MATCH', adminDecision: null }],'DELIVERED'],
    ['BOUGHT','CAPTURED',[],'DELIVERED'],
    ['BOUGHT','CAPTURED',[{ id: 'proof', aiResult: 'MATCH', adminDecision: 'REJECTED' }],'DELIVERED'],
  ]) {
    const h = actionMocks([{ id: 'item', orderId: 'order', status, order: { paymentState }, proofs }]);
    assert.equal((await h.updateGiftStatus(['item'],target)).ok, false); assert.equal(h.writes(), 0);
  }
});
test('reset refuses to erase outstanding authorization records', async () => {
  let reset = false;
  const route = load('app/api/admin/reset/route.ts', {
    'next/server': next, '@/lib/db': { db: { order: { count: async () => 1 } } },
    '@/lib/seed': { resetAndSeed: async () => { reset = true; } },
  }, { ADMIN_PASSCODE: 'test-only' });
  const response = await route.POST(new Request('https://example.test', { method: 'POST', headers: { 'x-admin-passcode': 'test-only' } }));
  assert.equal(response.status, 409); assert.equal(reset, false);
});
test('checkout rejects a foreign custom ID before requesting capture or authorization', async () => {
  let chargeCalls = 0;
  const { finishCheckout } = load('app/give/actions.ts', {
    'next/headers': { cookies: async () => ({}) },
    '@prisma/client': { ItemStatus: {}, OrderStatus: {}, OrderType: {}, PaymentState: {}, Prisma: {} },
    '@/lib/db': { db: { order: { findUnique: async () => null } } },
    '@/lib/channel3': { Channel3Error: Error },
    '@/lib/giving': { decodeSpec: () => null },
    '@/lib/paypal': {
      getPayPalOrder: async () => ({ status: 'APPROVED', purchaseUnits: [{ customId: 'foreign' }] }),
      capturePayPalOrder: async () => chargeCalls++, authorizePayPalOrder: async () => chargeCalls++,
    }, '@/lib/holds': {},
  });
  assert.equal((await finishCheckout('VALIDORDER', {})).ok, false); assert.equal(chargeCalls, 0);
});
