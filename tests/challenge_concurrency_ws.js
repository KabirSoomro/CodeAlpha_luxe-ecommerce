/**
 * ============================================================================
 * GATE CHALLENGER 1: ADVERSARIAL WEBSOCKET & CONCURRENCY STRESS HARNESS
 * Target: D:/Short_Course/Intership_Project/CodeAlpha/luxe_ecommerce
 * Focus:
 *  1. Concurrent Sessions Sync (dual WebSocket sessions, DOM badge & button reactivity)
 *  2. TOCTOU Race Condition Safety (CHAL-02) (N=10 parallel checkouts for 1 unit)
 *  3. Multi-Item Compensation Rollback Verification
 *  4. Event Payload Conformity ({ productId, countInStock, newStock }) & Socket Binding
 * ============================================================================
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

module.paths.push(path.join(__dirname, '../backend/node_modules'));
module.paths.push(path.join(__dirname, '../frontend/node_modules'));
module.paths.push(path.join(__dirname, '../node_modules'));

const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const envPath = path.join(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const JWT_SECRET = process.env.JWT_SECRET || 'luxe_premium_secret_123';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

let passedCount = 0;
let failedCount = 0;
const failureDetails = [];

function pass(name, detail = '') {
  passedCount++;
  console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${name}${detail ? colors.dim + ' — ' + detail + colors.reset : ''}`);
}

function fail(name, error) {
  failedCount++;
  const msg = error && error.message ? error.message : String(error);
  failureDetails.push({ name, error: msg });
  console.error(`  ${colors.red}✖ [FAIL]${colors.reset} ${name}`);
  console.error(`         ${colors.red}Error: ${msg}${colors.reset}`);
}

function subHeader(title) {
  console.log(`\n${colors.yellow}▶ [CHALLENGE] ${title}${colors.reset}`);
}

function httpRequest(port, method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const reqHeaders = { ...headers };

    if (body !== null && body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: 'localhost',
      port,
      path: urlPath,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json,
        });
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

// Connect a live WebSocket client and track incoming packets
function createWsClient(port) {
  const wsUrl = `ws://localhost:${port}/socket.io/?EIO=4&transport=websocket`;
  const client = new globalThis.WebSocket(wsUrl);
  const events = [];

  const readyPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WS handshake timeout')), 5000);

    client.onopen = () => {
      client.send('40'); // Socket.io protocol connect packet
    };

    client.onmessage = (event) => {
      const msg = event.data.toString();
      if (msg.startsWith('40')) {
        clearTimeout(timer);
        resolve();
      } else if (msg.startsWith('42')) {
        try {
          const parsed = JSON.parse(msg.slice(2));
          events.push({
            event: parsed[0],
            data: parsed[1],
            timestamp: Date.now(),
          });
        } catch (err) {}
      }
    };

    client.onerror = (err) => {
      clearTimeout(timer);
      reject(err);
    };
  });

  return { client, events, readyPromise };
}

async function runAdversarialStressHarness() {
  console.log(`\n${colors.bright}${colors.magenta}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}   GATE CHALLENGER 1: REAL-TIME WEBSOCKET & TOCTOU CONCURRENCY TEST   ${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}======================================================================${colors.reset}`);

  const { app, server, io } = require('../backend/server');
  const User = require('../backend/models/User');
  const Product = require('../backend/models/Product');
  const Order = require('../backend/models/Order');

  const cleanupFixtures = {
    userIds: [],
    productIds: [],
    orderIds: [],
  };

  const PORT = server.address() ? server.address().port : (process.env.PORT || 5000);

  // Ensure DB ready
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (mongoose.connection.readyState === 1) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  // Create dedicated test customer
  const testUser = await User.create({
    name: 'Challenger Test User',
    email: `challenger_${Date.now()}@luxe.challenge`,
    password: 'password123',
    role: 'Customer',
  });
  cleanupFixtures.userIds.push(testUser._id);
  const userToken = jwt.sign({ id: testUser._id }, JWT_SECRET, { expiresIn: '1d' });

  // -------------------------------------------------------------------------
  // CHALLENGE 1: Server Socket Instance Binding & Event Payload Conformity
  // -------------------------------------------------------------------------
  subHeader('Challenge 1: Server Socket Binding & stockUpdate Payload Conformity');
  try {
    if (!app.get('io')) {
      throw new Error('app.get("io") is undefined! Server failed to bind socket instance to Express.');
    }
    if (app.get('io') !== io) {
      throw new Error('app.get("io") does not match exported io instance.');
    }
    pass('Server socket instance binding verified (app.set("io", io) and app.get("io"))');

    // Create a product to test payload structure
    const payloadProd = await Product.create({
      user: testUser._id,
      name: `Payload Test Product ${Date.now()}`,
      brand: 'TestBrand',
      category: 'Electronics',
      description: 'Verifying payload keys',
      price: 100,
      countInStock: 10,
      image: 'https://example.com/img.jpg',
    });
    cleanupFixtures.productIds.push(payloadProd._id);

    // Connect a listener WS client
    const ws = createWsClient(PORT);
    await ws.readyPromise;

    // Order 2 items
    const orderRes = await httpRequest(
      PORT,
      'POST',
      '/api/orders',
      { Authorization: `Bearer ${userToken}` },
      {
        orderItems: [{ product: payloadProd._id.toString(), qty: 2, name: payloadProd.name, price: 100, image: payloadProd.image }],
        shippingAddress: { address: '123 St', city: 'City', postalCode: '10001', country: 'US' },
        paymentMethod: 'CreditCard',
        totalPrice: 200,
      }
    );

    if (orderRes.status !== 201) {
      throw new Error(`Order placement failed: HTTP ${orderRes.status}`);
    }
    cleanupFixtures.orderIds.push(orderRes.json._id);

    // Await payload
    let receivedPayload = null;
    const startWait = Date.now();
    while (Date.now() - startWait < 3000) {
      const evt = ws.events.find(e => e.event === 'stockUpdate' && e.data && e.data.productId === payloadProd._id.toString());
      if (evt) {
        receivedPayload = evt.data;
        break;
      }
      await new Promise(r => setTimeout(r, 50));
    }

    if (!receivedPayload) {
      throw new Error('Did not receive stockUpdate event over WebSocket');
    }

    // Verify exact contract { productId, countInStock, newStock }
    if (typeof receivedPayload.productId !== 'string' || receivedPayload.productId !== payloadProd._id.toString()) {
      throw new Error(`Invalid or missing productId in payload: ${JSON.stringify(receivedPayload)}`);
    }
    if (typeof receivedPayload.countInStock !== 'number' || receivedPayload.countInStock !== 8) {
      throw new Error(`Invalid countInStock in payload: expected 8, got ${receivedPayload.countInStock}`);
    }
    if (typeof receivedPayload.newStock !== 'number' || receivedPayload.newStock !== 8) {
      throw new Error(`Invalid newStock in payload: expected 8, got ${receivedPayload.newStock}`);
    }

    pass('stockUpdate payload conformity verified: { productId, countInStock, newStock } match expected types and values');
    ws.client.close();
  } catch (err) {
    fail('Challenge 1 (Payload conformity & Socket binding) failed', err);
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 2: TOCTOU Race Condition Safety (10 Simultaneous Checkouts for 1 Item)
  // -------------------------------------------------------------------------
  subHeader('Challenge 2: TOCTOU Race Condition Safety (CHAL-02) under 10 Simultaneous Checkouts');
  try {
    const scarceProd = await Product.create({
      user: testUser._id,
      name: `Scarce Luxury Item ${Date.now()}`,
      brand: 'Vault Limited',
      category: 'Jewelry',
      description: 'Only 1 unit available in entire world',
      price: 9999,
      countInStock: 1,
      image: 'https://example.com/ring.jpg',
    });
    cleanupFixtures.productIds.push(scarceProd._id);

    // Connect a WS client to capture the broadcast
    const ws = createWsClient(PORT);
    await ws.readyPromise;

    // Fire 10 simultaneous orders competing for this single unit
    const N = 10;
    const checkoutPromises = [];
    for (let i = 0; i < N; i++) {
      checkoutPromises.push(
        httpRequest(
          PORT,
          'POST',
          '/api/orders',
          { Authorization: `Bearer ${userToken}` },
          {
            orderItems: [{ product: scarceProd._id.toString(), qty: 1, name: scarceProd.name, price: 9999, image: scarceProd.image }],
            shippingAddress: { address: 'Penthouse', city: 'New York', postalCode: '10001', country: 'USA' },
            paymentMethod: 'CreditCard',
            totalPrice: 9999,
          }
        )
      );
    }

    const results = await Promise.all(checkoutPromises);

    const successOrders = results.filter(r => r.status === 201);
    const rejectedOrders = results.filter(r => r.status === 400);

    for (const s of successOrders) {
      if (s.json && s.json._id) cleanupFixtures.orderIds.push(s.json._id);
    }

    if (successOrders.length !== 1) {
      throw new Error(`CRITICAL RACE CONDITION: Expected exactly 1 order to succeed, but ${successOrders.length} succeeded! (Overselling detected)`);
    }
    pass(`Simultaneous checkout concurrency: Exactly 1 order succeeded out of ${N} concurrent requests`);

    if (rejectedOrders.length !== N - 1) {
      throw new Error(`Expected ${N - 1} orders to be rejected with HTTP 400, but got ${rejectedOrders.length}`);
    }
    for (const r of rejectedOrders) {
      if (!r.json || !r.json.message.includes('Insufficient stock')) {
        throw new Error(`Expected 'Insufficient stock' message in rejected order, got: ${r.body}`);
      }
    }
    pass(`Conflicting concurrent orders properly rejected with HTTP 400 ("Insufficient stock") (${rejectedOrders.length}/${N - 1})`);

    // Check database document directly
    const finalProd = await Product.findById(scarceProd._id);
    if (finalProd.countInStock !== 0) {
      throw new Error(`CRITICAL INVENTORY CORRUPTION: countInStock expected 0, but is ${finalProd.countInStock}`);
    }
    pass('Database inventory non-negativity: countInStock is exactly 0 (no negative stock)');

    // Await WebSocket broadcast of stockUpdate with countInStock: 0
    let zeroStockEvent = null;
    const startZeroWait = Date.now();
    while (Date.now() - startZeroWait < 3000) {
      zeroStockEvent = ws.events.find(e => e.event === 'stockUpdate' && e.data && e.data.productId === scarceProd._id.toString());
      if (zeroStockEvent) break;
      await new Promise(r => setTimeout(r, 50));
    }

    if (!zeroStockEvent) {
      throw new Error('WebSocket client did not receive stockUpdate for depleted item');
    }
    if (zeroStockEvent.data.countInStock !== 0 || zeroStockEvent.data.newStock !== 0) {
      throw new Error(`Expected stockUpdate to broadcast 0, got ${JSON.stringify(zeroStockEvent.data)}`);
    }
    pass('WebSocket broadcasted stockUpdate with countInStock: 0 to all connected clients');

    ws.client.close();
  } catch (err) {
    fail('Challenge 2 (TOCTOU race condition safety) failed', err);
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 3: Multi-Item Compensation Rollback Stress Test
  // -------------------------------------------------------------------------
  subHeader('Challenge 3: Multi-Item Compensation Rollback & Socket Broadcast');
  try {
    const itemA = await Product.create({
      user: testUser._id,
      name: `Multi-Item A ${Date.now()}`,
      brand: 'BrandA',
      category: 'Luxury',
      description: 'Sufficient stock item',
      price: 200,
      countInStock: 5,
      image: 'https://example.com/a.jpg',
    });
    cleanupFixtures.productIds.push(itemA._id);

    const itemB = await Product.create({
      user: testUser._id,
      name: `Multi-Item B ${Date.now()}`,
      brand: 'BrandB',
      category: 'Luxury',
      description: 'Insufficient stock item',
      price: 300,
      countInStock: 1, // Only 1 in stock
      image: 'https://example.com/b.jpg',
    });
    cleanupFixtures.productIds.push(itemB._id);

    const ws = createWsClient(PORT);
    await ws.readyPromise;

    // Place an order requiring 2 of Item A (stock 5) and 2 of Item B (stock 1 -> will fail)
    const multiOrderRes = await httpRequest(
      PORT,
      'POST',
      '/api/orders',
      { Authorization: `Bearer ${userToken}` },
      {
        orderItems: [
          { product: itemA._id.toString(), qty: 2, name: itemA.name, price: 200, image: itemA.image },
          { product: itemB._id.toString(), qty: 2, name: itemB.name, price: 300, image: itemB.image },
        ],
        shippingAddress: { address: '123 St', city: 'City', postalCode: '10001', country: 'US' },
        paymentMethod: 'CreditCard',
        totalPrice: 1000,
      }
    );

    if (multiOrderRes.status !== 400) {
      throw new Error(`Expected HTTP 400 for multi-item failure, got ${multiOrderRes.status}`);
    }
    pass('Order rejected with HTTP 400 due to Item B insufficient stock');

    // Verify Item A was restored back to 5 in MongoDB
    const restoredItemA = await Product.findById(itemA._id);
    if (restoredItemA.countInStock !== 5) {
      throw new Error(`ROLLBACK FAILURE: Item A countInStock should be 5, but is ${restoredItemA.countInStock}`);
    }
    pass('Multi-item compensation rollback: Item A stock restored to 5 in MongoDB Atlas');

    // Verify Item B was untouched (remains 1)
    const untouchedItemB = await Product.findById(itemB._id);
    if (untouchedItemB.countInStock !== 1) {
      throw new Error(`Item B countInStock corrupted: expected 1, got ${untouchedItemB.countInStock}`);
    }
    pass('Item B stock remains untouched at 1');

    // Verify rollback emission occurred over WebSocket for Item A
    let rollbackEvent = null;
    const startRbWait = Date.now();
    while (Date.now() - startRbWait < 3000) {
      rollbackEvent = ws.events.find(
        e => e.event === 'stockUpdate' && e.data && e.data.productId === itemA._id.toString() && e.data.countInStock === 5
      );
      if (rollbackEvent) break;
      await new Promise(r => setTimeout(r, 50));
    }

    if (!rollbackEvent) {
      throw new Error('Rollback event restoring stock to 5 was not broadcasted over WebSocket');
    }
    pass('Compensation rollback broadcasted stockUpdate restoring Item A to 5 to all clients');

    ws.client.close();
  } catch (err) {
    fail('Challenge 3 (Multi-item rollback) failed', err);
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 4: Concurrent Sessions UI Sync Without Page Refresh
  // -------------------------------------------------------------------------
  subHeader('Challenge 4: Concurrent Sessions UI Sync (Badge & Button Out-of-Stock Disabling)');
  try {
    const liveSyncProd = await Product.create({
      user: testUser._id,
      name: `Live Session Sync Gem ${Date.now()}`,
      brand: 'Challenger Haute',
      category: 'Watches',
      description: 'Dual session live DOM synchronization test',
      price: 5000,
      countInStock: 8,
      image: 'https://example.com/watch.jpg',
    });
    cleanupFixtures.productIds.push(liveSyncProd._id);
    const prodId = liveSyncProd._id.toString();

    // Client Session 2 simulated DOM environment matching React components
    const session2Badge = {
      id: `stock-badge-${prodId}`,
      textContent: '8 in stock',
      className: 'stock-badge in-stock',
      classList: {
        remove: (...classes) => {
          for (const c of classes) {
            session2Badge.className = session2Badge.className.replace(new RegExp(`\\b${c}\\b`, 'g'), '').trim();
          }
        },
        add: (...classes) => {
          for (const c of classes) {
            if (!session2Badge.className.includes(c)) {
              session2Badge.className = `${session2Badge.className} ${c}`.trim();
            }
          }
        },
      },
    };

    const session2Button = {
      disabled: false,
      textContent: 'Add to Cart',
      className: 'btn-primary',
      classList: {
        remove: (...classes) => {
          for (const c of classes) {
            session2Button.className = session2Button.className.replace(new RegExp(`\\b${c}\\b`, 'g'), '').trim();
          }
        },
        add: (...classes) => {
          for (const c of classes) {
            if (!session2Button.className.includes(c)) {
              session2Button.className = `${session2Button.className} ${c}`.trim();
            }
          }
        },
      },
    };

    const session2DOM = {
      getElementById: (id) => (id === `stock-badge-${prodId}` ? session2Badge : null),
      querySelector: (sel) => (sel === `button[data-product-id="${prodId}"]` ? session2Button : null),
    };

    // React SocketContext.jsx updateProductStockUI implementation
    function updateProductStockUI(productId, count) {
      const stockCount = typeof count === 'number' ? count : parseInt(count, 10);
      const badge = session2DOM.getElementById(`stock-badge-${productId}`);
      if (badge) {
        if (stockCount > 0) {
          badge.textContent = `${stockCount} in stock`;
          badge.classList.remove('out-of-stock');
          badge.classList.add('in-stock');
          badge.classList.add('badge-pulse');
        } else {
          badge.textContent = 'Out of Stock';
          badge.classList.remove('in-stock');
          badge.classList.remove('badge-pulse');
          badge.classList.add('out-of-stock');
        }
      }

      const button = session2DOM.querySelector(`button[data-product-id="${productId}"]`);
      if (button) {
        if (stockCount > 0) {
          button.disabled = false;
          button.classList.remove('btn-disabled');
          button.classList.remove('opacity-50');
          button.classList.remove('cursor-not-allowed');
          button.textContent = 'Add to Cart';
        } else {
          button.disabled = true;
          button.classList.add('btn-disabled');
          button.classList.add('opacity-50');
          button.classList.add('cursor-not-allowed');
          button.textContent = 'Out of Stock';
        }
      }
    }

    // Connect Client Session 2 via WebSocket
    const session2Ws = createWsClient(PORT);
    await session2Ws.readyPromise;

    // Attach listener to update Client Session 2 DOM on 'stockUpdate'
    session2Ws.client.onmessage = (event) => {
      const msg = event.data.toString();
      if (msg.startsWith('42')) {
        try {
          const parsed = JSON.parse(msg.slice(2));
          if (parsed[0] === 'stockUpdate' && parsed[1] && parsed[1].productId === prodId) {
            const stock = parsed[1].countInStock !== undefined ? parsed[1].countInStock : parsed[1].newStock;
            updateProductStockUI(prodId, stock);
          }
        } catch (e) {}
      }
    };

    pass('Client Session 2 established live WebSocket connection and DOM listener');

    // 1. Client Session 1 checks out 3 items (stock: 8 -> 5)
    const checkoutPartRes = await httpRequest(
      PORT,
      'POST',
      '/api/orders',
      { Authorization: `Bearer ${userToken}` },
      {
        orderItems: [{ product: prodId, qty: 3, name: liveSyncProd.name, price: 5000, image: liveSyncProd.image }],
        shippingAddress: { address: '777 Ocean Dr', city: 'Miami', postalCode: '33139', country: 'USA' },
        paymentMethod: 'CreditCard',
        totalPrice: 15000,
      }
    );

    if (checkoutPartRes.status !== 201) {
      throw new Error(`Partial checkout failed: HTTP ${checkoutPartRes.status}`);
    }
    cleanupFixtures.orderIds.push(checkoutPartRes.json._id);

    // Verify Session 2 updates to '5 in stock'
    const startSync1 = Date.now();
    while (Date.now() - startSync1 < 3000) {
      if (session2Badge.textContent === '5 in stock') break;
      await new Promise(r => setTimeout(r, 50));
    }

    if (session2Badge.textContent !== '5 in stock') {
      throw new Error(`Session 2 badge failed to update: expected '5 in stock', got '${session2Badge.textContent}'`);
    }
    if (!session2Badge.className.includes('in-stock') || !session2Badge.className.includes('badge-pulse')) {
      throw new Error(`Session 2 badge classes invalid: '${session2Badge.className}'`);
    }
    if (session2Button.disabled !== false || session2Button.textContent !== 'Add to Cart') {
      throw new Error('Session 2 button should remain enabled with "Add to Cart"');
    }
    pass('Client Session 1 checkout -> Client Session 2 visibly decrements 8 -> 5 with badge-pulse without page refresh');

    // 2. Client Session 1 checks out remaining 5 items (stock: 5 -> 0)
    const checkoutAllRes = await httpRequest(
      PORT,
      'POST',
      '/api/orders',
      { Authorization: `Bearer ${userToken}` },
      {
        orderItems: [{ product: prodId, qty: 5, name: liveSyncProd.name, price: 5000, image: liveSyncProd.image }],
        shippingAddress: { address: '777 Ocean Dr', city: 'Miami', postalCode: '33139', country: 'USA' },
        paymentMethod: 'CreditCard',
        totalPrice: 25000,
      }
    );

    if (checkoutAllRes.status !== 201) {
      throw new Error(`Full checkout failed: HTTP ${checkoutAllRes.status}`);
    }
    cleanupFixtures.orderIds.push(checkoutAllRes.json._id);

    // Verify Session 2 transitions to 'Out of Stock' and button disables
    const startSync2 = Date.now();
    while (Date.now() - startSync2 < 3000) {
      if (session2Badge.textContent === 'Out of Stock') break;
      await new Promise(r => setTimeout(r, 50));
    }

    if (session2Badge.textContent !== 'Out of Stock') {
      throw new Error(`Session 2 badge failed to update to 'Out of Stock': got '${session2Badge.textContent}'`);
    }
    if (!session2Badge.className.includes('out-of-stock') || session2Badge.className.includes('in-stock')) {
      throw new Error(`Session 2 badge classes invalid: '${session2Badge.className}'`);
    }
    if (session2Button.disabled !== true) {
      throw new Error('Session 2 button should be disabled when stock hits 0');
    }
    if (!session2Button.className.includes('btn-disabled') || !session2Button.className.includes('cursor-not-allowed')) {
      throw new Error(`Session 2 button classes invalid: '${session2Button.className}'`);
    }
    if (session2Button.textContent !== 'Out of Stock') {
      throw new Error(`Expected button text 'Out of Stock', got '${session2Button.textContent}'`);
    }

    pass('Client Session 1 checkout to 0 -> Client Session 2 visibly updates to "Out of Stock" and disables button without page refresh');

    session2Ws.client.close();
  } catch (err) {
    fail('Challenge 4 (Concurrent sessions sync) failed', err);
  }

  // -------------------------------------------------------------------------
  // CLEANUP
  // -------------------------------------------------------------------------
  subHeader('Teardown & Cleanup');
  try {
    for (const oId of cleanupFixtures.orderIds) {
      await Order.findByIdAndDelete(oId);
    }
    for (const pId of cleanupFixtures.productIds) {
      await Product.findByIdAndDelete(pId);
    }
    for (const uId of cleanupFixtures.userIds) {
      await User.findByIdAndDelete(uId);
    }
    pass(`Cleaned up ${cleanupFixtures.orderIds.length} orders, ${cleanupFixtures.productIds.length} products, ${cleanupFixtures.userIds.length} users`);
  } catch (cleanErr) {
    fail('Cleanup failed', cleanErr);
  }

  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}CHALLENGE RESULTS: ${passedCount} Passed, ${failedCount} Failed${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialStressHarness().catch((err) => {
  console.error('Unhandled fatal error in challenge harness:', err);
  process.exit(1);
});
