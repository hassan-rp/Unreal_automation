import { logTestCaseData } from '@utilities/test.helper.utils';
import { getData, logoutPage } from '@data/login&LogoutFlow.data';
import { test } from '@fixtures/page.fixtures';

test.describe('Feature: Login and Logout', () => {
    const scenario1 = getData('AQ-134-Login');
    const scenario2 = logoutPage('AQ-134-Logout');

    test(`
        Test case: '${scenario1.testCaseData.testCase}'
        Description: '${scenario1.testCaseData.testDescription}'
        Tags: '${scenario1.testCaseData.tags}'
        `, async ({ loginPage }) => {
            logTestCaseData(test.info(), scenario1.testCaseData);

            await test.step('Admin user navigates to log in', async () => {
                await loginPage.navigateToLoginPage();
            });
            await test.step('Logging in and validating the welcome page', async () => {
                await loginPage.loginPage(scenario1.loginDetails);
            });
            await test.step('Dismissing modal if present on login', async () => {
                await loginPage.dismissModalIfPresent();
            });
        });

    test(`
        Test case: '${scenario2.testCaseData.testCase}'
        Description: '${scenario2.testCaseData.testDescription}'
        Tags: '${scenario2.testCaseData.tags}'
        `, async ({ loginPage }) => {
            logTestCaseData(test.info(), scenario2.testCaseData);

            await test.step('Admin user navigates to log in', async () => {
                await loginPage.navigateToLoginPage();
            });
            await test.step('Logging in and validating welcome page', async () => {
                await loginPage.loginPage(scenario1.loginDetails);
            });
            await test.step('Logging out', async () => {
                await loginPage.logoutPage();
            });
        });
});
