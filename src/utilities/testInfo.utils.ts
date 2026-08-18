import { TestInfo } from '@playwright/test';

export function createNoopTestInfo(): TestInfo {
    return { attach: async () => {} } as unknown as TestInfo;
}
