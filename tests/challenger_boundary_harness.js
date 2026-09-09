/**
 * ======================================================================
 * LUXE PREMIUM E-COMMERCE: ADVERSARIAL CHALLENGER HARNESS
 * Milestone 4 Gate Verification: Boundary Conditions, Validation, & Isolation
 * ======================================================================
 */

const path = require('path');

// Ensure module resolution works from backend/node_modules FIRST
module.paths.push(path.join(__dirname, '..', 'backend', 'node_modules'));
module.paths.push(path.join(__dirname, '..', 'node_modules'));

const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
}

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('../backend/models/User');
const Product = require('../backend/models/Product');
const Order = require('../backend/models/Order');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedAssertions++;
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    failedAssertions++;
    const msg = `  ✖ [FAIL] ${testName} - ${details}`;
    console.error(msg);
    failureDetails.push({ testName, details });
  }
}

// Track fixtures for cleanup
const fixtures = {
  users: [],
  products: [],
  orders: [],
};

async function createTestUser(name, email, role = 'Customer') {
  const user = await User.create({
    name,
    email,
    password: 'password123',
    role,
  });
  fixtures.users.push(user._id);
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'secret123',
    { expiresIn: '1h' }
  );
  return { user, token };
}

async function createTestProduct(name, stock, price = 100) {
  const product = await Product.create({
    name,
    price,
    description: `Adversarial test product ${name}`,
    image: '/images/products/gold_rolex.jpg',
    category: 'Watches',
    countInStock: stock,
  });
  fixtures.products.push(product._id);
  return product;
}

async function runAdversarialHarness() {
  console.log('======================================================================');
  console.log('  LUXE ADVERSARIAL CHALLENGE: BOUNDARY, VALIDATION & ISOLATION        ');
  console.log('======================================================================');
  console.log(`Timestamp       : ${new Date().toISOString()}`);
  console.log(`Target API Base : ${BASE_URL}`);

  // Connect to MongoDB Atlas
  if (mongoose.connection.readyState === 0) {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to MongoDB Atlas: ${mongoose.connection.host}`);
  }

  // Create Users: Customer A, Customer B, Admin
  const runId = Date.now().toString(36);
  const customerA = await createTestUser(`CustA_${runId}`, `custA_${runId}@luxe-test.com`, 'Customer');
  const customerB = await createTestUser(`CustB_${runId}`, `custB_${runId}@luxe-test.com`, 'Customer');
  const adminUser = await createTestUser(`Admin_${runId}`, `admin_${runId}@luxe-test.com`, 'Admin');

  console.log('\n▶ Section 1: Quantity Boundary Conditions (CHAL-01) & Stock Inflation Oracle');
  {
    const initialStock = 20;
    const testProduct = await createTestProduct(`Stock_Oracle_${runId}`, initialStock, 150);

    // Test cases for invalid quantities
    const adversarialQuantities = [
      { label: 'Negative quantity (qty: -5)', qty: -5 },
      { label: 'Negative quantity (qty: -1)', qty: -1 },
      { label: 'Large negative quantity (qty: -999999)', qty: -999999 },
      { label: 'Zero quantity (qty: 0)', qty: 0 },
      { label: 'Fractional quantity (qty: 1.5)', qty: 1.5 },
      { label: 'Fractional quantity (qty: 0.1)', qty: 0.1 },
      { label: 'Fractional quantity (qty: 2.999)', qty: 2.999 },
      { label: 'String numeric (qty: "5")', qty: "5" },
      { label: 'String text (qty: "invalid")', qty: "invalid" },
      { label: 'Null quantity (qty: null)', qty: null },
      { label: 'Undefined quantity (missing qty)', qty: undefined },
      { label: 'Object quantity (qty: {})', qty: {} },
      { label: 'Array quantity (qty: [1])', qty: [1] },
      { label: 'NaN quantity (qty: NaN)', qty: NaN },
      { label: 'Infinity quantity (qty: Infinity)', qty: Infinity },
    ];

    for (const tc of adversarialQuantities) {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerA.token}`,
        },
        body: JSON.stringify({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              qty: tc.qty,
              price: testProduct.price,
              image: testProduct.image,
            },
          ],
          shippingAddress: {
            address: '100 Luxury Way',
            city: 'Manhattan',
            postalCode: '10001',
            country: 'USA',
          },
          paymentMethod: 'CreditCard',
          totalPrice: 150,
        }),
      });

      const body = await res.json().catch(() => ({}));
      assert(
        res.status === 400,
        `Rejection of ${tc.label} returns HTTP 400`,
        `Received HTTP ${res.status}: ${JSON.stringify(body)}`
      );
      assert(
        body.message && body.message.toLowerCase().includes('quantity'),
        `Error message for ${tc.label} explains invalid quantity`,
        `Message: ${body.message}`
      );
    }

    // Stock Inflation Oracle Check
    const refreshedProduct = await Product.findById(testProduct._id);
    assert(
      refreshedProduct.countInStock === initialStock,
      `Zero Stock Inflation Oracle: initial stock ${initialStock} == current stock ${refreshedProduct.countInStock} after 15 boundary attack vectors`,
      `Stock was modified from ${initialStock} to ${refreshedProduct.countInStock}`
    );
  }

  console.log('\n▶ Section 2: Schema-Level Mongoose Order Enforcement');
  {
    const dummyProduct = await createTestProduct(`Schema_Dummy_${runId}`, 10, 50);

    // Test 2.1: Model validation with qty: 0
    let err0 = null;
    try {
      const orderZero = new Order({
        user: customerA.user._id,
        orderItems: [
          {
            name: 'Zero Qty Item',
            qty: 0,
            image: '/images/test.jpg',
            price: 50,
            product: dummyProduct._id,
          },
        ],
        shippingAddress: { address: 'A', city: 'B', postalCode: 'C', country: 'D' },
        paymentMethod: 'CreditCard',
        totalPrice: 0,
      });
      await orderZero.validate();
    } catch (err) {
      err0 = err;
    }
    assert(
      err0 && err0.name === 'ValidationError' && err0.errors['orderItems.0.qty'],
      'Order schema validator rejects orderItems.0.qty = 0',
      `Error: ${err0 ? err0.message : 'No error thrown'}`
    );
    assert(
      err0 && err0.errors['orderItems.0.qty'].message === 'Quantity must be at least 1',
      'Order schema min constraint produces exact message "Quantity must be at least 1"',
      `Actual message: ${err0 && err0.errors['orderItems.0.qty'] ? err0.errors['orderItems.0.qty'].message : ''}`
    );

    // Test 2.2: Model validation with qty: -5
    let errNeg = null;
    try {
      const orderNeg = new Order({
        user: customerA.user._id,
        orderItems: [
          {
            name: 'Negative Qty Item',
            qty: -5,
            image: '/images/test.jpg',
            price: 50,
            product: dummyProduct._id,
          },
        ],
        shippingAddress: { address: 'A', city: 'B', postalCode: 'C', country: 'D' },
        paymentMethod: 'CreditCard',
        totalPrice: -250,
      });
      await orderNeg.validate();
    } catch (err) {
      errNeg = err;
    }
    assert(
      errNeg && errNeg.name === 'ValidationError' && errNeg.errors['orderItems.0.qty'],
      'Order schema validator rejects orderItems.0.qty = -5',
      `Error: ${errNeg ? errNeg.message : 'No error thrown'}`
    );

    // Test 2.3: Model validation with valid qty: 1 passes
    let errValid = null;
    try {
      const orderValid = new Order({
        user: customerA.user._id,
        orderItems: [
          {
            name: 'Valid Qty Item',
            qty: 1,
            image: '/images/test.jpg',
            price: 50,
            product: dummyProduct._id,
          },
        ],
        shippingAddress: { address: 'A', city: 'B', postalCode: 'C', country: 'D' },
        paymentMethod: 'CreditCard',
        totalPrice: 50,
      });
      await orderValid.validate();
    } catch (err) {
      errValid = err;
    }
    assert(
      errValid === null,
      'Order schema validator accepts orderItems.0.qty = 1 without error',
      `Error: ${errValid ? errValid.message : ''}`
    );
  }

  console.log('\n▶ Section 3: Excessive Quantity & Multi-Item Rollback Stress Test');
  {
    // Test 3.1: Single item excessive stock
    const stockAvailable = 3;
    const prodExcess = await createTestProduct(`Excess_Prod_${runId}`, stockAvailable, 200);

    const resExcess = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify({
        orderItems: [
          {
            product: prodExcess._id.toString(),
            name: prodExcess.name,
            qty: 4, // 4 > 3 available
            price: 200,
            image: prodExcess.image,
          },
        ],
        shippingAddress: { address: '123 Main', city: 'NY', postalCode: '10001', country: 'USA' },
        paymentMethod: 'CreditCard',
        totalPrice: 800,
      }),
    });
    const bodyExcess = await resExcess.json().catch(() => ({}));
    assert(
      resExcess.status === 400,
      'Excessive quantity (qty > stock) returns HTTP 400',
      `HTTP status: ${resExcess.status}`
    );
    assert(
      bodyExcess.message && bodyExcess.message.includes('Insufficient stock'),
      'Excessive quantity response includes "Insufficient stock"',
      `Message: ${bodyExcess.message}`
    );

    const refreshedExcess = await Product.findById(prodExcess._id);
    assert(
      refreshedExcess.countInStock === stockAvailable,
      `Excessive quantity request leaves countInStock intact (${stockAvailable})`,
      `Actual stock: ${refreshedExcess.countInStock}`
    );

    // Test 3.2: Multi-Item Transaction Compensation Rollback
    // Item 1 has sufficient stock (stock = 10, ordered = 4)
    // Item 2 has insufficient stock (stock = 1, ordered = 5)
    // Item 1 must be decremented during loop, but rolled back when Item 2 fails!
    const prodRollback1 = await createTestProduct(`Rollback_1_${runId}`, 10, 100);
    const prodRollback2 = await createTestProduct(`Rollback_2_${runId}`, 1, 100);

    const resMulti = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify({
        orderItems: [
          {
            product: prodRollback1._id.toString(),
            name: prodRollback1.name,
            qty: 4,
            price: 100,
            image: prodRollback1.image,
          },
          {
            product: prodRollback2._id.toString(),
            name: prodRollback2.name,
            qty: 5, // Fails here!
            price: 100,
            image: prodRollback2.image,
          },
        ],
        shippingAddress: { address: '123 Main', city: 'NY', postalCode: '10001', country: 'USA' },
        paymentMethod: 'CreditCard',
        totalPrice: 900,
      }),
    });
    const bodyMulti = await resMulti.json().catch(() => ({}));
    assert(
      resMulti.status === 400,
      'Multi-item order with 1 insufficient item returns HTTP 400',
      `HTTP status: ${resMulti.status}, body: ${JSON.stringify(bodyMulti)}`
    );

    const refRollback1 = await Product.findById(prodRollback1._id);
    const refRollback2 = await Product.findById(prodRollback2._id);
    assert(
      refRollback1.countInStock === 10,
      `Multi-item compensation rollback: Product 1 stock restored to 10 (was temporarily decremented)`,
      `Product 1 stock: ${refRollback1.countInStock}`
    );
    assert(
      refRollback2.countInStock === 1,
      `Product 2 stock remains 1`,
      `Product 2 stock: ${refRollback2.countInStock}`
    );
  }

  console.log('\n▶ Section 4: Security, Authentication, & Cross-Customer Data Isolation');
  {
    // Test 4.1: Unauthenticated request to /api/orders/myorders returns HTTP 401
    const resUnauth = await fetch(`${BASE_URL}/api/orders/myorders`);
    assert(
      resUnauth.status === 401,
      'Unauthenticated request to GET /api/orders/myorders returns HTTP 401',
      `Received HTTP ${resUnauth.status}`
    );

    // Test 4.2: Malformed authorization header returns HTTP 401
    const resBadToken = await fetch(`${BASE_URL}/api/orders/myorders`, {
      headers: { Authorization: 'Bearer definitely.invalid.token' },
    });
    assert(
      resBadToken.status === 401,
      'Malformed token request to GET /api/orders/myorders returns HTTP 401',
      `Received HTTP ${resBadToken.status}`
    );

    // Test 4.3: Customer A and Customer B Cross-Account Data Isolation
    const orderProduct = await createTestProduct(`Order_Product_${runId}`, 50, 250);

    // Customer A places Order A
    const resOrderA = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify({
        orderItems: [
          {
            product: orderProduct._id.toString(),
            name: orderProduct.name,
            qty: 2,
            price: 250,
            image: orderProduct.image,
          },
        ],
        shippingAddress: { address: 'A Street', city: 'A City', postalCode: '11111', country: 'USA' },
        paymentMethod: 'CreditCard',
        totalPrice: 500,
      }),
    });
    const orderA = await resOrderA.json();
    assert(resOrderA.status === 201 && orderA._id, 'Customer A successfully creates Order A', `Status: ${resOrderA.status}`);
    fixtures.orders.push(orderA._id);

    // Customer B places Order B
    const resOrderB = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerB.token}`,
      },
      body: JSON.stringify({
        orderItems: [
          {
            product: orderProduct._id.toString(),
            name: orderProduct.name,
            qty: 1,
            price: 250,
            image: orderProduct.image,
          },
        ],
        shippingAddress: { address: 'B Street', city: 'B City', postalCode: '22222', country: 'USA' },
        paymentMethod: 'PayPal',
        totalPrice: 250,
      }),
    });
    const orderB = await resOrderB.json();
    assert(resOrderB.status === 201 && orderB._id, 'Customer B successfully creates Order B', `Status: ${resOrderB.status}`);
    fixtures.orders.push(orderB._id);

    // Customer A queries /api/orders/myorders
    const resMyOrdersA = await fetch(`${BASE_URL}/api/orders/myorders`, {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    const myOrdersA = await resMyOrdersA.json();
    assert(resMyOrdersA.status === 200, 'Customer A retrieves myorders with HTTP 200');
    assert(
      Array.isArray(myOrdersA) && myOrdersA.some((o) => o._id === orderA._id),
      'Customer A myorders contains Order A'
    );
    assert(
      !myOrdersA.some((o) => o._id === orderB._id),
      'Cross-customer isolation: Customer A CANNOT see Customer B order (Order B absent)',
      `Found Order B in Customer A response: ${JSON.stringify(myOrdersA)}`
    );

    // Customer B queries /api/orders/myorders
    const resMyOrdersB = await fetch(`${BASE_URL}/api/orders/myorders`, {
      headers: { Authorization: `Bearer ${customerB.token}` },
    });
    const myOrdersB = await resMyOrdersB.json();
    assert(resMyOrdersB.status === 200, 'Customer B retrieves myorders with HTTP 200');
    assert(
      Array.isArray(myOrdersB) && myOrdersB.some((o) => o._id === orderB._id),
      'Customer B myorders contains Order B'
    );
    assert(
      !myOrdersB.some((o) => o._id === orderA._id),
      'Cross-customer isolation: Customer B CANNOT see Customer A order (Order A absent)',
      `Found Order A in Customer B response: ${JSON.stringify(myOrdersB)}`
    );

    // Test 4.4: Role-Based Access Control (RBAC) - Non-admin access to Admin endpoints
    const adminEndpoints = [
      { method: 'GET', url: `${BASE_URL}/api/orders`, desc: 'GET /api/orders (all orders)' },
      { method: 'PUT', url: `${BASE_URL}/api/orders/${orderA._id}/deliver`, desc: 'PUT /api/orders/:id/deliver' },
      { method: 'GET', url: `${BASE_URL}/api/admin/products`, desc: 'GET /api/admin/products' },
      { method: 'POST', url: `${BASE_URL}/api/admin/products`, desc: 'POST /api/admin/products', body: { name: 'Hack', price: 10, countInStock: 5 } },
      { method: 'GET', url: `${BASE_URL}/api/admin/orders`, desc: 'GET /api/admin/orders' },
      { method: 'GET', url: `${BASE_URL}/api/admin/metrics`, desc: 'GET /api/admin/metrics' },
      { method: 'POST', url: `${BASE_URL}/api/products`, desc: 'POST /api/products', body: { name: 'Hack', price: 10, countInStock: 5 } },
      { method: 'PUT', url: `${BASE_URL}/api/products/${orderProduct._id}`, desc: 'PUT /api/products/:id', body: { price: 999 } },
      { method: 'DELETE', url: `${BASE_URL}/api/products/${orderProduct._id}`, desc: 'DELETE /api/products/:id' },
    ];

    for (const ep of adminEndpoints) {
      // 1. Unauthenticated request must return 401
      const resUnauthAdmin = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert(
        resUnauthAdmin.status === 401,
        `Unauthenticated ${ep.desc} returns HTTP 401`,
        `HTTP status: ${resUnauthAdmin.status}`
      );

      // 2. Customer token (non-admin) must return 401
      const resCustAdmin = await fetch(ep.url, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerA.token}`,
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      const custAdminBody = await resCustAdmin.json().catch(() => ({}));
      assert(
        resCustAdmin.status === 401,
        `Non-admin Customer access to ${ep.desc} blocked with HTTP 401`,
        `HTTP status: ${resCustAdmin.status}, body: ${JSON.stringify(custAdminBody)}`
      );
      assert(
        custAdminBody.message === 'Not authorized as an admin',
        `Non-admin error message is "Not authorized as an admin"`,
        `Actual: ${custAdminBody.message}`
      );

      // 3. Admin token must be authorized (not 401)
      if (ep.method === 'GET') {
        const resAdmin = await fetch(ep.url, {
          method: ep.method,
          headers: { Authorization: `Bearer ${adminUser.token}` },
        });
        assert(
          resAdmin.status === 200,
          `Admin access to ${ep.desc} returns HTTP 200`,
          `HTTP status: ${resAdmin.status}`
        );
      }
    }
  }

  console.log('\n▶ Section 5: Teardown & MongoDB Atlas Cleanup');
  {
    let deletedOrders = 0;
    let deletedProducts = 0;
    let deletedUsers = 0;

    if (fixtures.orders.length > 0) {
      const res = await Order.deleteMany({ _id: { $in: fixtures.orders } });
      deletedOrders = res.deletedCount;
    }
    if (fixtures.products.length > 0) {
      const res = await Product.deleteMany({ _id: { $in: fixtures.products } });
      deletedProducts = res.deletedCount;
    }
    if (fixtures.users.length > 0) {
      const res = await User.deleteMany({ _id: { $in: fixtures.users } });
      deletedUsers = res.deletedCount;
    }

    assert(deletedOrders === fixtures.orders.length, `Cleaned up ${deletedOrders} test order(s)`);
    assert(deletedProducts === fixtures.products.length, `Cleaned up ${deletedProducts} test product(s)`);
    assert(deletedUsers === fixtures.users.length, `Cleaned up ${deletedUsers} test user(s)`);

    await mongoose.connection.close();
    console.log('  ✔ [PASS] Database connection closed.');
  }

  console.log('\n======================================================================');
  console.log('  ADVERSARIAL CHALLENGE HARNESS SUMMARY                              ');
  console.log('======================================================================');
  console.log(`Total Assertions Passed : ${passedAssertions}`);
  console.log(`Total Assertions Failed : ${failedAssertions}`);

  if (failedAssertions > 0) {
    console.error(`\n✖ CHALLENGE HARNESS DETECTED ${failedAssertions} FAILURES:`);
    failureDetails.forEach((f, idx) => {
      console.error(`  ${idx + 1}. [${f.testName}] - ${f.details}`);
    });
    process.exit(1);
  } else {
    console.log('\n✔ ALL ADVERSARIAL CHALLENGE ASSERTIONS PASSED (100% PASS RATE)!');
    process.exit(0);
  }
}

runAdversarialHarness().catch((err) => {
  console.error('Fatal error during adversarial harness execution:', err);
  process.exit(1);
});
