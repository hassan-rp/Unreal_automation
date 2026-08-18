import { Page, TestInfo } from '@playwright/test';
import { TestCaseData } from '@interfaces/testcase.data.interface';
import { PlaywrightActionFactory } from '@utilities/playwright.actions.utils';
import { PlaywrightVerificationFactory } from '@utilities/playwright.verifications.utils';
import { LocatorInfo } from '@interfaces/locator.info.interface';
import { LoginDetails } from '@interfaces/login&LogoutFlow.interface';

const registeredPages = new WeakSet<Page>();

export function logTestCaseData(testInfo: TestInfo, scenario: TestCaseData): void {
  testInfo.annotations.push({ description: `Test case: ${scenario.testCase}`, type: 'info' });
  testInfo.annotations.push({ description: `Test Summary: ${scenario.testSummary}`, type: 'info' });
  testInfo.annotations.push({ description: `Description: ${scenario.testDescription}`, type: 'info' });
  testInfo.annotations.push({ description: `Tags: ${scenario.tags}`, type: 'info' });
}

interface DismissModalOptions {
  timeout?: number;
  closeButtonSelector?: string;
}

export async function dismissModalIfPresent(
  page: Page,
  options: DismissModalOptions = {},
): Promise<void> {
  const {
    timeout = 9000,
    closeButtonSelector = `//span/a[text()='X']`,
  } = options;
  // Same visible close control for wait + click (not an arbitrary DOM-first match).
  const closeBtn = page.locator(`${closeButtonSelector} >> visible=true`).first();

  await page.waitForLoadState();
  const isModalVisible = await closeBtn
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch((error) => {
      if (error instanceof Error && /Timeout/i.test(error.message)) {
        console.log('No modal visible; proceeding without dismissing.');
        return false;
      }
      throw error;
    });

  if (!isModalVisible) {
    return;
  }

  try {
    await closeBtn.click({ force: true, timeout: 5000 });
  } catch (error) {
    // Screenpopper may detach after close; other failures should surface.
    if (error instanceof Error && /detached|not attached/i.test(error.message)) {
      console.log('Modal close skipped; element detached.');
      return;
    }
    throw error;
  }
}

/**
 * Waits for the post-checkout tax-calculation modal to appear and then disappear.
 * The modal is JS-rendered after domcontentloaded, so load-state waits are insufficient.
 * If the modal never appears (fast server or skipped), this returns immediately.
 */
export async function waitForTaxCalculation(page: Page): Promise<void> {
  const taxModal = page.locator(`//p[contains(text(),'Tax calculation in progress')]`);
  const appeared = await taxModal
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await taxModal.waitFor({ state: 'hidden', timeout: 30000 });
  }
}

/**
 * Shared login-at-checkout sequence used by both plan and phone checkout flows.
 * Clicks the login link, fills credentials, signs in, then clicks the CHECKOUT button.
 * Each caller handles its own post-checkout verification.
 */
export async function loginAtCheckoutPage(
  page: Page,
  actions: PlaywrightActionFactory,
  verifications: PlaywrightVerificationFactory,
  data: LoginDetails,
): Promise<void> {
  const loginButton: LocatorInfo = {
    description: 'Login button at checkout',
    locator: page.locator(`//a[contains(normalize-space(.),'Already have an account')]`),
  };
  const loginFormHeader: LocatorInfo = {
    description: 'Login form header at checkout',
    locator: page.locator(`//h3[text()='Sign In or Register below to get started.']`),
  };
  const usernameInput: LocatorInfo = {
    description: 'Username input',
    locator: page.locator(`//input[@name="mdn"]`),
  };
  const rememberMe: LocatorInfo = {
    description: 'Remember Me checkbox',
    locator: page.locator(`//input[@name="remember_me2" and @value="1"]`),
  };
  const passwordInput: LocatorInfo = {
    description: 'Password input',
    locator: page.locator(`//input[@name='password']`),
  };
  const signIn: LocatorInfo = {
    description: 'Sign In button',
    locator: page.getByRole('button', { name: /sign in/i }),
  };
  const checkoutButton: LocatorInfo = {
    description: 'Checkout button',
    locator: page.locator(`//input[@value="CHECKOUT"]`),
  };

  // Promo modal on cart blocks the login toggle if not dismissed first.
  await dismissModalIfPresent(page, { timeout: 2000 });
  await actions.click(loginButton);
  await dismissModalIfPresent(page, { timeout: 3000 });
  await verifications.waitForVisibility(loginFormHeader);
  await actions.sendKeys(usernameInput, data.username);
  await actions.selectRadioButtonOrCheckBox(rememberMe);
  await actions.sendKeys(passwordInput, data.password);
  await actions.click(signIn);
  await verifications.waitForVisibility(checkoutButton);
  await actions.click(checkoutButton);
  await waitForTaxCalculation(page);
}

export function registerJsErrorListeners(page: Page, flowName: string): void {
  if (registeredPages.has(page)) {
    return;
  }

  page.on('pageerror', (error) => {
    console.error(`[${flowName}] Unhandled JS exception: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return;
    }

    console.error(`[${flowName}] Browser console error: ${message.text()}`);
  });

  registeredPages.add(page);
}
