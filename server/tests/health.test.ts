import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';

let mongoServer: MongoMemoryServer;

describe('Health Check & Database Connection API', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDatabase(uri);
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('GET /api/v1/health should report server healthy and database connected when DB is active', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.server).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.apiVersion).toBe('v1');
    expect(res.body.data.timestamp).toBeDefined();
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
  });

  it('GET /api/v1/health should report database disconnected when connection is severed', async () => {
    // Temporarily disconnect mongoose
    await mongoose.disconnect();

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.server).toBe('degraded');
    expect(res.body.data.database).toBe('disconnected');

    // Reconnect for subsequent tests
    const uri = mongoServer.getUri();
    await connectDatabase(uri);
  });
});
