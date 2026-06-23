import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { saveMvpConfig, readMvpConfig, listMvpConfigs } from '../src/core/fs/writer.js';

describe('MVP Config Module (writer.ts mvp helpers)', () => {
  const testWorkspace = path.join(__dirname, 'temp-mvp-workspace');

  beforeAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
    await fs.mkdir(testWorkspace, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testWorkspace, { recursive: true, force: true });
  });

  it('should save, read, and list mvp config files correctly', async () => {
    const mvpKey = 'checkout-integration';
    const mvpData = {
      name: 'Stripe Checkout',
      key: mvpKey,
      description: 'Integrate checkout system',
      features: ['Webhook route', 'Checkout page'],
      requirements: 'Prisma and Node',
      status: 'pending',
    };

    await saveMvpConfig(testWorkspace, mvpKey, mvpData);

    const list = await listMvpConfigs(testWorkspace);
    expect(list).toContain(mvpKey);

    const readData = await readMvpConfig(testWorkspace, mvpKey);
    expect(readData).toEqual(mvpData);
  });
});
