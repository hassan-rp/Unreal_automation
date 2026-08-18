import { chromium, FullConfig } from '@playwright/test';
import { deleteSessionState, ensureSession } from '@fixtures/session.fixtures';
import { loginWithDefaultUser, loginWithPaymentUser } from '@utilities/sessionLogin.helper';
import { getEnvVariable } from '@utilities/env.utils';

async function globalSetup(_config: FullConfig): Promise<void> {
  const browser = await chromium.launch({
    headless: process.env.CI ? true : false,
  });

  if (getEnvVariable('FORCE_NEW_SESSION', '') === 'true') {
    await deleteSessionState('default');
    await deleteSessionState('payment');
    console.log('[GlobalSetup] FORCE_NEW_SESSION=true — cleared existing sessions');
  }

  try {
    await ensureSession(browser, 'default', async (page) => {
      await loginWithDefaultUser(page);
    });

    if (getEnvVariable('payment_user_name', '')) {
      await ensureSession(browser, 'payment', async (page) => {
        await loginWithPaymentUser(page);
      });
    } else {
      console.log('[GlobalSetup] Skipping payment session — payment_user_name not configured');
    }
  } finally {
    await browser.close();
  }
}

export default globalSetup;
