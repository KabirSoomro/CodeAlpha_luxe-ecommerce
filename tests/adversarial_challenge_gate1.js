/**
 * ============================================================================
 * GATE CHALLENGER 1: ADVERSARIAL STRESS TEST HARNESS
 * Real-Time WebSocket Capabilities & Concurrency Race Condition Safety
 * ============================================================================
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

// Resolve node_modules across project
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

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${testName}${detail ? colors.dim + ' — ' + detail + colors.reset : ''}`);
  } else {
    failed++;
    failures.push({ testName, detail });
    console.error(`  ${colors.red}✖ [FAIL]${colors.reset} ${testName}`);
    if (detail) console.error(`         ${colors.red}Detail: ${detail}${colors.reset}`);
  }
}

function subHeader(title) {
  console.log(`\n${colors.bright}${colors.yellow}▶ ${title}${colors.reset}`);
}

function sectionHeader(title) {
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan} ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
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

// Track fixtures for guaranteed teardown
const cleanup = {
  users: [],
  products: [],
  orders: [],
};

async function runAdversarialChallenge() {
  console.log(`\n${colors.bright}${colors.magenta}######################################################################${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}#  GATE CHALLENGER 1: REAL-TIME WEBSOCKET & CONCURRENCY STRESS SUITE #${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}######################################################################${colors.reset}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const { app, server, io } = require('../backend/server');
  const User = require('../backend/models/User');
  const Product = require('../backend/models/Product');
  const Order = require('../backend/models/Order');

  const addr = server.address();
  const PORT = addr ? addr.port : (process.env.PORT || 5000);

  // Wait for Mongoose Atlas connection
  if (mongoose.connection.readyState !== 1) {
    console.log('Connecting to MongoDB Atlas...');
    await new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (mongoose.connection.readyState === 1) {
          clearInterval(check);
          resolve();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(check);
        if (mongoose.connection.readyState === 1) resolve();
        else reject(new Error('MongoDB Atlas timeout'));
      }, 30000);
    });
  }

  // Create test user and token
  const customer = await User.create({
    name: 'Challenger Customer',
    email: `challenger_${Date.now()}@luxetest.com`,
    password: 'password123',
    role: 'Customer',
  });
  cleanup.users.push(customer._id);
  const token = jwt.sign({ id: customer._id }, JWT_SECRET, { expiresIn: '1d' });
  const authHeaders = { Authorization: `Bearer ${token}` };

  // =========================================================================
  // CHALLENGE 1: TOCTOU RACE CONDITION SAFETY & CAS CONCURRENCY STRESS
  // =========================================================================
  sectionHeader('CHALLENGE 1: TOCTOU RACE CONDITION & CAS ATOMICITY UNDER CONTENTION');

  // Test 1.1: Flash Sale Stampede (25 concurrent requests for 1 remaining item)
  subHeader('1.1 Flash Sale Stampede: 25 Concurrent Orders for 1 Remaining Unit');
  {
    const flashProduct = await Product.create({
      user: customer._id,
      name: `Stampede Diamond Watch ${Date.now()}`,
      brand: 'LUXE Vault',
      category: 'Watches',
      description: 'Single stock high-contention item',
      price: 15000,
      countInStock: 1,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    });
    cleanup.products.push(flashProduct._id);

    const CONCURRENCY_LEVEL = 25;
    const checkoutPromises = Array.from({ length: CONCURRENCY_LEVEL }, (_, i) =>
      httpRequest(
        PORT,
        'POST',
        '/api/orders',
        authHeaders,
        {
          orderItems: [{
            product: flashProduct._id.toString(),
            qty: 1,
            name: flashProduct.name,
            price: flashProduct.price,
            image: flashProduct.image,
          }],
          shippingAddress: { address: `Avenue ${i}`, city: 'Geneva', postalCode: '1204', country: 'Switzerland' },
          paymentMethod: 'WireTransfer',
          totalPrice: 15000,
        }
      )
    );

    const results = await Promise.all(checkoutPromises);

    let successCount = 0;
    let failCount = 0;
    const successfulOrderIds = [];

    for (const res of results) {
      if (res.status === 201) {
        successCount++;
        if (res.json && res.json._id) {
          successfulOrderIds.push(res.json._id);
          cleanup.orders.push(res.json._id);
        }
      } else if (res.status === 400) {
        failCount++;
        assert(
          res.json && res.json.message && res.json.message.includes('Insufficient stock'),
          `Request error message describes insufficient stock`,
          res.json ? res.json.message : res.body
        );
      } else {
        assert(false, `Unexpected HTTP status in concurrent stampede`, `Status: ${res.status}`);
      }
    }

    assert(successCount === 1, 'Exactly 1 order succeeded among 25 simultaneous requests', `Successes: ${successCount}`);
    assert(failCount === 24, 'Exactly 24 orders rejected with HTTP 400', `Failures: ${failCount}`);

    const finalProduct = await Product.findById(flashProduct._id);
    assert(finalProduct.countInStock === 0, 'Database countInStock is exactly 0 (no overselling/negative stock)', `Actual: ${finalProduct.countInStock}`);

    // Verify Orders in DB for this product
    const createdOrdersInDb = await Order.find({ 'orderItems.product': flashProduct._id });
    assert(createdOrdersInDb.length === 1, 'Exactly 1 order document persisted in MongoDB Atlas', `Found: ${createdOrdersInDb.length}`);
  }

  // Test 1.2: Bulk Contention with Odd Quantity (15 requests for qty: 2 on stock: 5)
  subHeader('1.2 Bulk Contention: 15 Concurrent Orders for qty: 2 on Initial Stock: 5');
  {
    const bulkProduct = await Product.create({
      user: customer._id,
      name: `Limited Gold Cufflinks ${Date.now()}`,
      brand: 'LUXE Couture',
      category: 'Accessories',
      description: 'Stock of 5 units, requests of 2 units',
      price: 600,
      countInStock: 5,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    });
    cleanup.products.push(bulkProduct._id);

    const REQUEST_COUNT = 15;
    const bulkPromises = Array.from({ length: REQUEST_COUNT }, (_, i) =>
      httpRequest(
        PORT,
        'POST',
        '/api/orders',
        authHeaders,
        {
          orderItems: [{
            product: bulkProduct._id.toString(),
            qty: 2,
            name: bulkProduct.name,
            price: bulkProduct.price,
            image: bulkProduct.image,
          }],
          shippingAddress: { address: `Boulevard ${i}`, city: 'Paris', postalCode: '75008', country: 'France' },
          paymentMethod: 'CreditCard',
          totalPrice: 1200,
        }
      )
    );

    const bulkResults = await Promise.all(bulkPromises);

    let bulkSuccess = 0;
    let bulkFail = 0;

    for (const res of bulkResults) {
      if (res.status === 201) {
        bulkSuccess++;
        if (res.json && res.json._id) cleanup.orders.push(res.json._id);
      } else if (res.status === 400) {
        bulkFail++;
      }
    }

    // 5 available, each needs 2. Max possible is 2 (consuming 4). 1 remains.
    assert(bulkSuccess === 2, 'Exactly 2 orders succeeded (consuming 4 of 5 units)', `Successes: ${bulkSuccess}`);
    assert(bulkFail === 13, 'Remaining 13 orders failed due to insufficient stock', `Failures: ${bulkFail}`);

    const finalBulkProduct = await Product.findById(bulkProduct._id);
    assert(finalBulkProduct.countInStock === 1, 'Final stock in database is exactly 1 unit', `Actual: ${finalBulkProduct.countInStock}`);
  }

  // Test 1.3: Multi-Item Atomic Compensation Rollback
  subHeader('1.3 Multi-Item Atomic Compensation Rollback on Partial Item Failure');
  {
    // Item 1 has stock: 2, Item 2 has stock: 0
    const itemAvailable = await Product.create({
      user: customer._id,
      name: `Available Platinum Ring ${Date.now()}`,
      brand: 'LUXE Jewels',
      category: 'Jewelry',
      price: 3500,
      countInStock: 2,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    });
    cleanup.products.push(itemAvailable._id);

    const itemDepleted = await Product.create({
      user: customer._id,
      name: `Depleted Emerald Necklace ${Date.now()}`,
      brand: 'LUXE Jewels',
      category: 'Jewelry',
      price: 8900,
      countInStock: 0,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    });
    cleanup.products.push(itemDepleted._id);

    // Track WebSocket events during rollback
    const rollbackWsEvents = [];
    const wsUrl = `ws://localhost:${PORT}/socket.io/?EIO=4&transport=websocket`;
    const rollbackWs = new globalThis.WebSocket(wsUrl);

    await new Promise((resolve) => {
      rollbackWs.onopen = () => rollbackWs.send('40');
      rollbackWs.onmessage = (ev) => {
        const str = ev.data.toString();
        if (str.startsWith('40')) resolve();
        else if (str.startsWith('42')) {
          try {
            const p = JSON.parse(str.slice(2));
            rollbackWsEvents.push({ event: p[0], data: p[1] });
          } catch (e) {}
        }
      };
    });

    // Attempt order with [itemAvailable (qty: 1), itemDepleted (qty: 1)]
    const mixedOrderRes = await httpRequest(
      PORT,
      'POST',
      '/api/orders',
      authHeaders,
      {
        orderItems: [
          { product: itemAvailable._id.toString(), qty: 1, name: itemAvailable.name, price: itemAvailable.price, image: itemAvailable.image },
          { product: itemDepleted._id.toString(), qty: 1, name: itemDepleted.name, price: itemDepleted.price, image: itemDepleted.image },
        ],
        shippingAddress: { address: 'Via Montenapoleone', city: 'Milan', postalCode: '20121', country: 'Italy' },
        paymentMethod: 'CreditCard',
        totalPrice: 12400,
      }
    );

    assert(mixedOrderRes.status === 400, 'Multi-item order with 1 out-of-stock item returns HTTP 400', `Status: ${mixedOrderRes.status}`);

    // Verify Item 1 was completely rolled back in database
    const dbItemAvailable = await Product.findById(itemAvailable._id);
    assert(dbItemAvailable.countInStock === 2, 'Item 1 stock accurately restored to 2 via rollback', `Actual: ${dbItemAvailable.countInStock}`);

    const dbItemDepleted = await Product.findById(itemDepleted._id);
    assert(dbItemDepleted.countInStock === 0, 'Item 2 stock remains unchanged at 0', `Actual: ${dbItemDepleted.countInStock}`);

    // Verify no order document was created in MongoDB
    const ordersFound = await Order.find({ 'orderItems.product': itemAvailable._id });
    assert(ordersFound.length === 0, 'Zero order documents created in database for failed multi-item transaction', `Orders count: ${ordersFound.length}`);

    // Verify rollback emission occurred so clients have consistent stock
    await new Promise(r => setTimeout(r, 200));
    const rollbackEvent = rollbackWsEvents.find(
      e => e.event === 'stockUpdate' && e.data && e.data.productId === itemAvailable._id.toString()
    );
    assert(rollbackEvent !== undefined, 'Rollback emitted stockUpdate to restore stock visibility', JSON.stringify(rollbackEvent));
    if (rollbackEvent) {
      assert(rollbackEvent.data.countInStock === 2, 'Rollback stockUpdate payload reflects restored count: 2', `count: ${rollbackEvent.data.countInStock}`);
    }

    rollbackWs.close();
  }

  // =========================================================================
  // CHALLENGE 2: REAL-TIME WEBSOCKET CONCURRENT SESSIONS SYNCHRONIZATION
  // =========================================================================
  sectionHeader('CHALLENGE 2: REAL-TIME WEBSOCKET DUAL CONCURRENT SESSION SYNC');

  subHeader('2.1 Multi-Client Live Sync: Session 1 Checkout Decrements Session 2 Display');
  {
    const syncProduct = await Product.create({
      user: customer._id,
      name: `Real-Time Chronometer ${Date.now()}`,
      brand: 'LUXE Horlogerie',
      category: 'Watches',
      price: 4200,
      countInStock: 7,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    });
    cleanup.products.push(syncProduct._id);
    const syncId = syncProduct._id.toString();

    // Session 2 DOM Representation
    const session2Badge = {
      id: `stock-badge-${syncId}`,
      className: 'stock-badge in-stock',
      textContent: '7 in stock',
      classList: {
        remove: (cls) => { session2Badge.className = session2Badge.className.replace(new RegExp(`\\b${cls}\\b`, 'g'), '').trim(); },
        add: (cls) => { if (!session2Badge.className.includes(cls)) session2Badge.className = `${session2Badge.className} ${cls}`.trim(); },
      },
    };

    const session2Button = {
      disabled: false,
      className: 'btn-primary',
      textContent: 'Add to Cart',
      classList: {
        remove: (cls) => { session2Button.className = session2Button.className.replace(new RegExp(`\\b${cls}\\b`, 'g'), '').trim(); },
        add: (cls) => { if (!session2Button.className.includes(cls)) session2Button.className = `${session2Button.className} ${cls}`.trim(); },
      },
    };

    const session2Dom = {
      getElementById: (id) => (id === `stock-badge-${syncId}` ? session2Badge : null),
      querySelector: (sel) => (sel === `button[data-product-id="${syncId}"]` ? session2Button : null),
    };

    function session2StockHandler(productId, count) {
      const stockCount = typeof count === 'number' ? count : parseInt(count, 10);
      const badge = session2Dom.getElementById(`stock-badge-${productId}`);
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
      const button = session2Dom.querySelector(`button[data-product-id="${productId}"]`);
      if (button) {
        if (stockCount > 0) {
          button.disabled = false;
          button.classList.remove('btn-disabled');
          button.textContent = 'Add to Cart';
        } else {
          button.disabled = true;
          button.classList.add('btn-disabled');
          button.textContent = 'Out of Stock';
        }
      }
    }

    // Connect Session 2 to WebSocket
    const session2Events = [];
    const wsUrl = `ws://localhost:${PORT}/socket.io/?EIO=4&transport=websocket`;
    const session2Ws = new globalThis.WebSocket(wsUrl);

    await new Promise((resolve) => {
      session2Ws.onopen = () => session2Ws.send('40');
      session2Ws.onmessage = (ev) => {
        const msg = ev.data.toString();
        if (msg.startsWith('40')) resolve();
        else if (msg.startsWith('42')) {
          try {
            const p = JSON.parse(msg.slice(2));
            const evtName = p[0];
            const evtData = p[1];
            session2Events.push({ event: evtName, data: evtData });
            if (evtName === 'stockUpdate' && evtData && evtData.productId === syncId) {
              const remaining = evtData.countInStock !== undefined ? evtData.countInStock : evtData.newStock;
              session2StockHandler(evtData.productId, remaining);
            }
          } catch (e) {}
        }
      };
    });

    assert(session2Badge.textContent === '7 in stock', 'Session 2 initialized with 7 in stock');
    assert(session2Button.disabled === false, 'Session 2 button initialized enabled');

    // Action 1: Client Session 1 executes checkout for 3 units
    const s1Order = await httpRequest(
      PORT,
      'POST',
      '/api/orders',
      authHeaders,
      {
        orderItems: [{ product: syncId, qty: 3, name: syncProduct.name, price: syncProduct.price, image: syncProduct.image }],
        shippingAddress: { address: 'Mayfair', city: 'London', postalCode: 'W1K', country: 'UK' },
        paymentMethod: 'CreditCard',
        totalPrice: 12600,
      }
    );

    assert(s1Order.status === 201, 'Session 1 checkout completed with HTTP 201');
    if (s1Order.json && s1Order.json._id) cleanup.orders.push(s1Order.json._id);

    // Wait for Session 2 to receive event and update DOM
    const startWait1 = Date.now();
    while (Date.now() - startWait1 < 2000) {
      if (session2Badge.textContent === '4 in stock') break;
      await new Promise(r => setTimeout(r, 50));
    }

    assert(session2Badge.textContent === '4 in stock', 'Session 2 badge updated to "4 in stock" without refresh', session2Badge.textContent);
    assert(session2Badge.className.includes('in-stock') && session2Badge.className.includes('badge-pulse'), 'Session 2 badge has in-stock and badge-pulse classes', session2Badge.className);
    assert(session2Button.disabled === false, 'Session 2 Add to Cart button remains enabled');

    // Action 2: Client Session 1 purchases remaining 4 units (depleting to 0)
    subHeader('2.2 Out-of-Stock Transition: Depletion Disables Add to Cart in Session 2');

    const s1Deplete = await httpRequest(
      PORT,
      'POST',
      '/api/orders',
      authHeaders,
      {
        orderItems: [{ product: syncId, qty: 4, name: syncProduct.name, price: syncProduct.price, image: syncProduct.image }],
        shippingAddress: { address: 'Mayfair', city: 'London', postalCode: 'W1K', country: 'UK' },
        paymentMethod: 'CreditCard',
        totalPrice: 16800,
      }
    );

    assert(s1Deplete.status === 201, 'Session 1 depletion checkout completed with HTTP 201');
    if (s1Deplete.json && s1Deplete.json._id) cleanup.orders.push(s1Deplete.json._id);

    const startWait2 = Date.now();
    while (Date.now() - startWait2 < 2000) {
      if (session2Badge.textContent === 'Out of Stock') break;
      await new Promise(r => setTimeout(r, 50));
    }

    assert(session2Badge.textContent === 'Out of Stock', 'Session 2 badge visibly transitioned to "Out of Stock"', session2Badge.textContent);
    assert(session2Badge.className.includes('out-of-stock'), 'Session 2 badge applied .out-of-stock class', session2Badge.className);
    assert(session2Button.disabled === true, 'Session 2 button transitioned to disabled (disabled: true)');
    assert(session2Button.className.includes('btn-disabled'), 'Session 2 button applied .btn-disabled class', session2Button.className);
    assert(session2Button.textContent === 'Out of Stock', 'Session 2 button text updated to "Out of Stock"');

    session2Ws.close();
  }

  // =========================================================================
  // CHALLENGE 3: EVENT PAYLOAD CONFORMITY & SOCKET BINDING
  // =========================================================================
  sectionHeader('CHALLENGE 3: EVENT PAYLOAD CONFORMITY & SOCKET INSTANCE BINDING');

  subHeader('3.1 Payload Structure & Type Conformity: { productId, countInStock, newStock }');
  {
    const payloadProduct = await Product.create({
      user: customer._id,
      name: `Payload Verification Ring ${Date.now()}`,
      brand: 'LUXE Fine',
      category: 'Jewelry',
      price: 2200,
      countInStock: 10,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    });
    cleanup.products.push(payloadProduct._id);
    const pid = payloadProduct._id.toString();

    let capturedPayload = null;
    const wsUrl = `ws://localhost:${PORT}/socket.io/?EIO=4&transport=websocket`;
    const payloadWs = new globalThis.WebSocket(wsUrl);

    await new Promise((resolve) => {
      payloadWs.onopen = () => payloadWs.send('40');
      payloadWs.onmessage = (ev) => {
        const msg = ev.data.toString();
        if (msg.startsWith('40')) resolve();
        else if (msg.startsWith('42')) {
          try {
            const p = JSON.parse(msg.slice(2));
            if (p[0] === 'stockUpdate' && p[1] && p[1].productId === pid) {
              capturedPayload = p[1];
            }
          } catch (e) {}
        }
      };
    });

    // Buy 2
    const res = await httpRequest(
      PORT,
      'POST',
      '/api/orders',
      authHeaders,
      {
        orderItems: [{ product: pid, qty: 2, name: payloadProduct.name, price: payloadProduct.price, image: payloadProduct.image }],
        shippingAddress: { address: 'Rodeo Drive', city: 'Beverly Hills', postalCode: '90210', country: 'USA' },
        paymentMethod: 'CreditCard',
        totalPrice: 4400,
      }
    );
    assert(res.status === 201, 'Order completed for payload test');
    if (res.json && res.json._id) cleanup.orders.push(res.json._id);

    const startWait = Date.now();
    while (Date.now() - startWait < 2000) {
      if (capturedPayload) break;
      await new Promise(r => setTimeout(r, 50));
    }

    assert(capturedPayload !== null, 'WebSocket received stockUpdate payload');
    if (capturedPayload) {
      assert(typeof capturedPayload.productId === 'string', 'payload.productId is String', typeof capturedPayload.productId);
      assert(capturedPayload.productId === pid, 'payload.productId matches target product ID', capturedPayload.productId);
      assert(typeof capturedPayload.countInStock === 'number', 'payload.countInStock is Number', typeof capturedPayload.countInStock);
      assert(capturedPayload.countInStock === 8, 'payload.countInStock matches decremented stock (8)', capturedPayload.countInStock);
      assert(typeof capturedPayload.newStock === 'number', 'payload.newStock is Number', typeof capturedPayload.newStock);
      assert(capturedPayload.newStock === 8, 'payload.newStock matches countInStock (8)', capturedPayload.newStock);
      assert(capturedPayload.countInStock === capturedPayload.newStock, 'payload.countInStock === payload.newStock for universal compatibility');
    }

    payloadWs.close();
  }

  subHeader('3.2 Server Socket Instance Binding & Context Injection');
  {
    assert(app.get('io') !== undefined, 'app.get("io") is defined on Express instance');
    assert(app.get('io') === io, 'app.get("io") references the active Socket.io server instance');
    assert(typeof io.emit === 'function', 'io.emit is callable for broadcasting');

    // Test middleware injection
    const healthRes = await httpRequest(PORT, 'GET', '/api/health');
    assert(healthRes.status === 200, 'Health endpoint responds HTTP 200', healthRes.body);
  }

  // =========================================================================
  // CLEANUP FIXTURES
  // =========================================================================
  sectionHeader('TEARDOWN & CLEANUP');
  {
    if (cleanup.orders.length > 0) {
      const delOrders = await Order.deleteMany({ _id: { $in: cleanup.orders } });
      console.log(`  Cleaned up ${delOrders.deletedCount} challenge orders`);
    }
    if (cleanup.products.length > 0) {
      const delProds = await Product.deleteMany({ _id: { $in: cleanup.products } });
      console.log(`  Cleaned up ${delProds.deletedCount} challenge products`);
    }
    if (cleanup.users.length > 0) {
      const delUsers = await User.deleteMany({ _id: { $in: cleanup.users } });
      console.log(`  Cleaned up ${delUsers.deletedCount} challenge users`);
    }
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  sectionHeader('CHALLENGE VERDICT SUMMARY');
  console.log(`Total Assertions Passed : ${passed}`);
  console.log(`Total Assertions Failed : ${failed}`);

  if (failed === 0) {
    console.log(`\n${colors.bright}${colors.green}>>> ALL ADVERSARIAL STRESS CHALLENGES PASSED SUCCESSFULLY! <<<\n${colors.reset}`);
    process.exit(0);
  } else {
    console.error(`\n${colors.bright}${colors.red}>>> ADVERSARIAL CHALLENGE DETECTED ${failed} FAILURES! <<<\n${colors.reset}`);
    process.exit(1);
  }
}

runAdversarialChallenge().catch((err) => {
  console.error('Fatal challenge execution error:', err);
  process.exit(1);
});
