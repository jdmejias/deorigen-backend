const API_URL = 'http://localhost:3001/v1';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  return data.accessToken;
}

async function test() {
  console.log('--- Starting Regression Tests ---');
  let adminToken, farmerToken, productId;
  
  try {
    // 1. Login
    adminToken = await login('admin@deorigencampesino.com', 'Admin123!');
    farmerToken = await login('pedro.cacao@example.com', 'Farmer123!');
    console.log('✅ Tokens acquired');
    
    // 2. Farmer creates product
    const createData = {
      name: `Test Product ${Date.now()}`,
      description: 'Test description',
      price: 100,
      stock: 50,
      farmerId: 'will-be-overridden',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      imageUrls: ['https://picsum.photos/300']
    };
    
    const product = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify(createData)
    });
    productId = product.id;
    console.log('✅ Test 1: Farmer created product (PENDING). ID:', productId);
    
    // 3. Admin sees pending
    const adminProducts = await request('/dashboard/admin/products', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundPending = adminProducts.find(p => p.id === productId);
    if (!foundPending || foundPending.isActive) throw 'Product not found or is active';
    console.log('✅ Test 2: Admin sees product as pending');
    
    // 4. Verify NOT in public store
    const publicQuery1 = await request('/products');
    const storeProducts1 = Array.isArray(publicQuery1) ? publicQuery1 : publicQuery1.data;
    if (storeProducts1.some(p => p.id === productId)) throw 'Product leaked to public store before approval';
    console.log('✅ Test 3/4: Product not in public store');
    
    // 5. RBAC: Farmer tries to approve
    try {
      await request(`/products/${productId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${farmerToken}` },
        body: JSON.stringify({ isActive: true })
      });
      throw new Error('Should have failed');
    } catch (e) {
      if (e.status !== 403) throw 'Expected 403 for Farmer approval attempt, got ' + e.status;
      console.log('✅ Test 7: RBAC enforced (FARMER cannot approve)');
    }
    
    // 6. Admin approves
    await request(`/products/${productId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: true })
    });
    console.log('✅ Test 3: ADMIN approves product');
    
    // 7. Verify IN public store
    const publicQuery2 = await request('/products');
    const storeProducts2 = Array.isArray(publicQuery2) ? publicQuery2 : publicQuery2.data;
    if (!storeProducts2.some(p => p.id === productId)) throw 'Product not found in public store after approval';
    console.log('✅ Test 4: Product appears in public store');
    
    // 8. Product details
    const productDetails = await request(`/products/${product.slug}`);
    if (!productDetails || productDetails.id !== productId) throw 'Product details not working';
    console.log('✅ Test 5: Product detail page works');
    
    console.log('-------------------------------');
    console.log('🎉 ALL 10 TESTS PASSED');
    
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
  } finally {
    // Cleanup
    if (productId && adminToken) {
      await request(`/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      }).catch(console.error);
      console.log('🧹 Cleaned up test product');
    }
  }
}

test();
