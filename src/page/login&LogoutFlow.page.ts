import { Page, TestInfo, test } from '@playwright/test';
import { PlaywrightActionFactory } from '@utilities/playwright.actions.utils';
import { PlaywrightVerificationFactory } from '@utilities/playwright.verifications.utils';
import { LocatorInfo } from '@interfaces/locator.info.interface';
import { LoginDetails } from '@interfaces/login&LogoutFlow.interface';
import { dismissModalIfPresent as dismissModalIfPresentHelper, registerJsErrorListeners } from '@utilities/test.helper.utils';

export class LoginPage {
    private readonly page: Page;
    private readonly testInfo: TestInfo;
    private readonly playwrightActionsFactory: PlaywrightActionFactory;
    private readonly playwrightVerificationsFactory: PlaywrightVerificationFactory;
    private readonly locators: { [key: string]: LocatorInfo };

    constructor(page: Page, testInfo: TestInfo) {
        this.page = page;
        this.testInfo = testInfo;
        this.playwrightActionsFactory = new PlaywrightActionFactory(page, testInfo);
        this.playwrightVerificationsFactory = new PlaywrightVerificationFactory(page, testInfo);
        registerJsErrorListeners(this.page, 'LoginPage');

        this.locators = {
            usernameInput: {
                description: 'Username input field',
                locator: this.page.locator(`//input[@placeholder="eMail Address"]`),
            },
            passwordInput: {
                description: 'Password input field',
                locator: this.page.locator(`//input[@placeholder="Password"]`),
            },
            logInButton: {
                description: 'Login button',
                locator: this.page.locator(`//button[@id="new_id_login_embed"]`),
            },
            continueWithGoogleButton: {
                description: 'Continue with Google button',
                locator: this.page.locator(`//span[text()="Continue with Google"]`),
            },
            showPasswordButton: {
                description: 'Show password button',
                locator: this.page.locator(`//span[@class="show-password fa fa-eye"]`),
            },
            hidePasswordButton: {
                description: 'Hide password button',
                locator: this.page.locator(`//span[@class="hide-password fa fa-eye-slash"]`),
            },
            verifyWelcomePage: {
                description: 'Verify Welcome page',
                locator: this.page.locator(`//p[normalize-space(text())='Hello,']`),
            },
            logoutButton: {
                description: 'Logout button',
                locator: this.page.locator(`(//a[normalize-space(text())='Logout'])[1]`),
            },
            verifyLogoutPage: {
                description: 'Verify Logout page',
                locator: this.page.locator(`//span[normalize-space(text())='Ready to get started, Lets go!']`),
            },
        };
    }

    public async navigateToLoginPage(): Promise<void> {
        await test.step('Navigate to Login Page', async () => {
            const loginURL = process.env.loginURL;
            if (!loginURL) {
                throw new Error("Environment variable 'loginURL' is not set or empty. Cannot navigate to login page.");
            }
            await this.playwrightActionsFactory.navigateToURL(loginURL);
        });
    }

    public async loginPage(data: LoginDetails): Promise<void> {
        const runLogin = async (): Promise<void> => {
            await this.page.waitForLoadState();
            await this.submitLogin(data);
            await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }).catch(() => undefined);
            try {
                await this.playwrightVerificationsFactory.waitForVisibility(this.locators.verifyWelcomePage);
            } catch {
                console.warn('verifyWelcomePage is not visible');
            }
            const currentUrl = this.page.url();
            if (currentUrl.includes('/login')) {
                console.warn(`[LoginPage] Still on login page - retrying | user=${data.username}`);
                await this.playwrightActionsFactory.refreshBrowser();
                await this.submitLogin(data);
                await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 }).catch(() => undefined);
                const retryUrl = this.page.url();
                if (retryUrl.includes('/login')) {
                    throw new Error(`[LoginPage] Login failed after retry | user=${data.username} | url=${retryUrl}`);
                }
            }
            console.log('Login successful, navigating to the welcome page.');
            await this.playwrightVerificationsFactory.expectElementExist(this.locators.verifyWelcomePage);
        };

        try {
            await test.step('Username Field', runLogin);
        } catch (error: unknown) {
            if (error instanceof Error && error.message.includes('can only be called from a test')) {
                await runLogin();
                return;
            }
            throw error;
        }
    }

    public async dismissModalIfPresent(): Promise<void> {
        await dismissModalIfPresentHelper(this.page);
    }

    public async logoutPage(): Promise<void> {
        await test.step('Logout', async () => {
            await this.page.waitForLoadState();
            await this.playwrightActionsFactory.click(this.locators.logoutButton);
            await this.page.waitForLoadState();
            await this.playwrightVerificationsFactory.waitForVisibility(this.locators.verifyLogoutPage);
            await this.playwrightVerificationsFactory.expectElementExist(this.locators.verifyLogoutPage);
        });
    }

    private async submitLogin(data: LoginDetails): Promise<void> {
        await this.playwrightActionsFactory.sendKeys(this.locators.usernameInput, data.username);
        await this.playwrightActionsFactory.sendKeys(this.locators.passwordInput, data.password, true);
        await this.playwrightActionsFactory.click(this.locators.showPasswordButton);
        await this.playwrightActionsFactory.click(this.locators.hidePasswordButton);
        await this.playwrightActionsFactory.click(this.locators.logInButton);
    }
}
