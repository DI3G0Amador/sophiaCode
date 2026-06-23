import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
const tempHome = path.join(__dirname, 'temp-home-test');
vi.spyOn(os, 'homedir').mockReturnValue(tempHome);
describe('Global Config Module (fs/global-config.ts)', () => {
    let readGlobalConfig;
    let saveGlobalConfig;
    let getApiKey;
    let saveApiKey;
    beforeAll(async () => {
        // Force clean up
        await fs.rm(tempHome, { recursive: true, force: true });
        await fs.mkdir(tempHome, { recursive: true });
        // Dynamically import to ensure os.homedir mock is active during resolution
        const module = await import('../fs/global-config.js');
        readGlobalConfig = module.readGlobalConfig;
        saveGlobalConfig = module.saveGlobalConfig;
        getApiKey = module.getApiKey;
        saveApiKey = module.saveApiKey;
    });
    afterAll(async () => {
        await fs.rm(tempHome, { recursive: true, force: true });
    });
    it('should return an empty object if no config file exists', async () => {
        const config = await readGlobalConfig();
        expect(config).toEqual({});
    });
    it('should save and read global config values correctly', async () => {
        const testConfig = {
            geminiApiKey: 'gemini-test-key',
            openaiApiKey: 'openai-test-key'
        };
        await saveGlobalConfig(testConfig);
        const config = await readGlobalConfig();
        expect(config).toEqual(testConfig);
    });
    it('should retrieve key from global config when environment variable is missing', async () => {
        const oldKey = process.env.GEMINI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        await saveApiKey('gemini', 'my-gemini-global-key');
        const resolvedKey = await getApiKey('gemini');
        expect(resolvedKey).toBe('my-gemini-global-key');
        process.env.GEMINI_API_KEY = oldKey;
    });
    it('should prioritize environment variables over global config keys', async () => {
        const oldKey = process.env.OPENAI_API_KEY;
        process.env.OPENAI_API_KEY = 'env-priority-key';
        await saveApiKey('openai', 'global-fallback-key');
        const resolvedKey = await getApiKey('openai');
        expect(resolvedKey).toBe('env-priority-key');
        if (oldKey === undefined) {
            delete process.env.OPENAI_API_KEY;
        }
        else {
            process.env.OPENAI_API_KEY = oldKey;
        }
    });
});
