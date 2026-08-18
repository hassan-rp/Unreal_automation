import { createGuestContext, createStoredSessionContext, ensureSession } from '@fixtures/session.fixtures';
import { LoginPage } from '@page/login&LogoutFlow.page';
import { test as base, Page } from '@playwright/test';
import { loginWithDefaultUser, loginWithPaymentUser } from '@utilities/sessionLogin.helper';

type TestFixtures = {
  defaultSessionPage: Page;
  guestPage: Page;
  loginPage: LoginPage;
  paymentSessionPage: Page;
};

export const test = base.extend<TestFixtures>({
  defaultSessionPage: async ({ browser }, use, testInfo) => {
    await ensureSession(browser, 'default', async (sessionPage) => {
      await loginWithDefaultUser(sessionPage, testInfo);
    });
    const context = await createStoredSessionContext(browser, 'default');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  guestPage: async ({ browser }, use) => {
    const context = await createGuestContext(browser);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  loginPage: async ({ guestPage }, use, testInfo) => {
    await use(new LoginPage(guestPage, testInfo));
  },
  paymentSessionPage: async ({ browser }, use, testInfo) => {
    await ensureSession(browser, 'payment', async (sessionPage) => {
      await loginWithPaymentUser(sessionPage, testInfo);
    });
    const context = await createStoredSessionContext(browser, 'payment');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
