import { Page, TestInfo } from '@playwright/test';
import { LoginPage } from '@page/login&LogoutFlow.page';
import { LoginDetails } from '@interfaces/login&LogoutFlow.interface';
import { getEnvVariable } from '@utilities/env.utils';
import { createNoopTestInfo } from '@utilities/testInfo.utils';

async function attachSessionFailureEvidence(
    page: Page,
    testInfo: TestInfo | undefined,
    sessionLabel: string,
): Promise<void> {
    if (!testInfo) {
        return;
    }
    try {
        const screenshot = await page.screenshot({ fullPage: true });
        await testInfo.attach(`${sessionLabel}-session-login-failure`, {
            body: screenshot,
            contentType: 'image/png',
        });
    } catch (attachError) {
        console.error(`[SessionLogin] Failed to attach screenshot for ${sessionLabel}`, attachError);
    }
}

export async function loginWithStoredSession(
    page: Page,
    testInfo: TestInfo | undefined,
    loginDetails: LoginDetails,
    sessionLabel: 'default' | 'payment' = 'default',
): Promise<void> {
    const loginPage = new LoginPage(page, testInfo ?? createNoopTestInfo());
    const loginURL = getEnvVariable('loginURL');

    console.log(`[SessionLogin] Starting ${sessionLabel} session login | user=${loginDetails.username}`);

    try {
        await page.goto(loginURL, { waitUntil: 'domcontentloaded' });
        await loginPage.loginPage(loginDetails);

        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            throw new Error(
                `[SessionLogin] Session login did not complete successfully. Still on login page for ${sessionLabel} session. currentUrl=${currentUrl}`,
            );
        }
        console.log(`[SessionLogin] ${sessionLabel} session login successful | user=${loginDetails.username}`);
    } catch (error) {
        const currentUrl = page.url();
        console.error(
            `[SessionLogin] ${sessionLabel} session login failed | user=${loginDetails.username} | currentUrl=${currentUrl}`,
            error,
        );
        await attachSessionFailureEvidence(page, testInfo, sessionLabel);
        throw new Error(
            `[SessionLogin] Failed to create ${sessionLabel} session for user ${loginDetails.username}. currentUrl=${currentUrl}. Original error: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

export async function loginWithDefaultUser(page: Page, testInfo?: TestInfo): Promise<void> {
    await loginWithStoredSession(
        page,
        testInfo,
        {
            username: getEnvVariable('user_name'),
            password: getEnvVariable('password'),
        },
        'default',
    );
}

export async function loginWithPaymentUser(page: Page, testInfo?: TestInfo): Promise<void> {
    await loginWithStoredSession(
        page,
        testInfo,
        {
            username: getEnvVariable('payment_user_name', '') || getEnvVariable('user_name'),
            password: getEnvVariable('payment_password', '') || getEnvVariable('password'),
        },
        'payment',
    );
}
