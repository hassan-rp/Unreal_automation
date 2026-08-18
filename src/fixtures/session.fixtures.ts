import fs from 'fs';
import path from 'path';
import { Browser, BrowserContext, Page } from '@playwright/test';
import { getContextOptions, getEnvVariable } from '@utilities/env.utils';

export type SessionType = 'default' | 'payment';

const ENV_TYPE = getEnvVariable('ENV_TYPE', 'prod');
const AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth');
const NAV_TIMEOUT = 60 * 1000;
const ACTION_TIMEOUT = 45 * 1000;

function applyContextTimeouts(context: BrowserContext): void {
    context.setDefaultNavigationTimeout(NAV_TIMEOUT);
    context.setDefaultTimeout(ACTION_TIMEOUT);
}

function ensureAuthDir(): void {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
}

function getSessionPath(sessionType: SessionType): string {
    return path.join(AUTH_DIR, `${ENV_TYPE}-${sessionType}-session.json`);
}

async function createContext(
    browser: Browser,
    extra: Parameters<Browser['newContext']>[0] = {},
): Promise<BrowserContext> {
    const context = await browser.newContext({
        ...getContextOptions(),
        ...extra,
    });
    applyContextTimeouts(context);
    return context;
}

export async function createGuestContext(browser: Browser): Promise<BrowserContext> {
    return createContext(browser);
}

export async function createStoredSessionContext(
    browser: Browser,
    sessionType: SessionType,
): Promise<BrowserContext> {
    return createContext(browser, { storageState: getSessionPath(sessionType) });
}

export async function sessionExists(sessionType: SessionType): Promise<boolean> {
    ensureAuthDir();
    return fs.existsSync(getSessionPath(sessionType));
}

export async function saveSessionState(
    context: BrowserContext,
    sessionType: SessionType,
): Promise<void> {
    ensureAuthDir();
    await context.storageState({ path: getSessionPath(sessionType) });
}

export async function deleteSessionState(sessionType: SessionType): Promise<void> {
    const sessionPath = getSessionPath(sessionType);
    if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
    }
}

export async function isSessionStillValid(
    browser: Browser,
    sessionType: SessionType,
): Promise<boolean> {
    const sessionPath = getSessionPath(sessionType);
    if (!fs.existsSync(sessionPath)) {
        return false;
    }

    try {
        const context = await createContext(browser, { storageState: sessionPath });
        const page = await context.newPage();
        try {
            await page.goto(getEnvVariable('sessionCheckURL'), { waitUntil: 'domcontentloaded' });
            const stillLoggedIn = !page.url().includes('/login');
            await context.close();
            return stillLoggedIn;
        } catch {
            await context.close();
            return false;
        }
    } catch (contextError) {
        console.warn(`[Session] Failed to create context with session | path=${sessionPath}`, contextError);
        return false;
    }
}

export async function ensureSession(
    browser: Browser,
    sessionType: SessionType,
    buildSession: (page: Page) => Promise<void>,
): Promise<string> {
    ensureAuthDir();
    const sessionPath = getSessionPath(sessionType);

    try {
        if (await isSessionStillValid(browser, sessionType)) {
            console.log(`[Session] Reusing existing ${sessionType} session | path=${sessionPath}`);
            return sessionPath;
        }

        console.warn(`[Session] Creating new ${sessionType} session | path=${sessionPath}`);
        const context = await createContext(browser);
        const page = await context.newPage();

        try {
            await buildSession(page);
            const currentUrl = page.url();
            console.log(`[Session] Login builder completed | session=${sessionType} | currentUrl=${currentUrl}`);
            await context.storageState({ path: sessionPath });
            console.log(`[Session] Saved ${sessionType} session successfully | path=${sessionPath}`);
            await context.close();
            return sessionPath;
        } catch (error) {
            const currentUrl = page.url();
            console.error(
                `[Session] Failed while building ${sessionType} session | currentUrl=${currentUrl} | path=${sessionPath}`,
                error,
            );
            await context.close();
            throw new Error(
                `[Session] Could not create ${sessionType} session. currentUrl=${currentUrl}. Original error: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    } catch (error) {
        console.error(`[Session] ensureSession failed for ${sessionType}`, error);
        throw error;
    }
}
