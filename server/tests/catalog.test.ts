import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';

let mongoServer: MongoMemoryServer;

describe('Product & Category Catalog API', () => {
  let categoryId: string;
  let testProductId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDatabase(uri);

    // Seed test category
    const cat = await Category.create({
      name: 'Rice and Atta',
      slug: 'rice-and-atta',
      description: 'Grains and flours',
      displayOrder: 1,
    });
    categoryId = cat._id.toString();

    // Seed test products
    const p1 = await Product.create({
      name: 'Aashirvaad Sharbati Atta',
      slug: 'aashirvaad-sharbati-atta-5kg',
      brand: 'Aashirvaad',
      category: cat._id,
      price: 295,
      discountedPrice: 265,
      unit: '5 kg',
      stockQuantity: 100,
      isAvailable: true,
      isFeatured: true,
      tags: ['atta', 'flour'],
    });
    testProductId = p1._id.toString();

    await Product.create({
      name: 'India Gate Basmati Rice',
      slug: 'india-gate-basmati-rice-5kg',
      brand: 'India Gate',
      category: cat._id,
      price: 490,
      discountedPrice: 420,
      unit: '5 kg',
      stockQuantity: 50,
      isAvailable: true,
      isFeatured: false,
      tags: ['rice', 'basmati'],
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('GET /api/v1/categories should return active grocery categories', async () => {
    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    expect(res.body.data.categories.length).toBeGreaterThan(0);
    expect(res.body.data.categories[0].name).toBe('Rice and Atta');
  });

  it('GET /api/v1/products should return list of products with pagination', async () => {
    const res = await request(app).get('/api/v1/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.products)).toBe(true);
    expect(res.body.data.products.length).toBe(2);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.total).toBe(2);
  });

  it('GET /api/v1/products?category=rice-and-atta should filter by category slug', async () => {
    const res = await request(app).get('/api/v1/products?category=rice-and-atta');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(2);
    expect(res.body.data.products[0].brand).toBeDefined();
  });

  it('GET /api/v1/products?search=basmati should filter products by keyword', async () => {
    const res = await request(app).get('/api/v1/products?search=basmati');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(1);
    expect(res.body.data.products[0].name).toContain('Basmati');
  });

  it('GET /api/v1/products?sortBy=price_asc should sort by lowest price first', async () => {
    const res = await request(app).get('/api/v1/products?sortBy=price_asc');

    expect(res.status).toBe(200);
    expect(res.body.data.products[0].price).toBe(295);
    expect(res.body.data.products[1].price).toBe(490);
  });

  it('GET /api/v1/products/:id should return single product and related items', async () => {
    const res = await request(app).get(`/api/v1/products/${testProductId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product).toBeDefined();
    expect(res.body.data.product.name).toBe('Aashirvaad Sharbati Atta');
    expect(Array.isArray(res.body.data.relatedProducts)).toBe(true);
  });

  it('GET /api/v1/products/invalid-id-or-slug should return 404', async () => {
    const res = await request(app).get('/api/v1/products/non-existent-product-slug');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
