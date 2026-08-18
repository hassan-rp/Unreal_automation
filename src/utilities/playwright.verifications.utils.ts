import { LocatorInfo } from '../interfaces/locator.info.interface';
import { expect, Page, test, TestInfo } from '@playwright/test';
import fs from 'fs';
import PdfParse from 'pdf-parse';

const _testStep = test.step.bind(test);
async function safeStep<T>(title: string, fn: () => T | Promise<T>): Promise<T> {
    try {
        return await _testStep(title, fn);
    } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('can only be called from a test')) {
            return fn() as Promise<T>;
        }
        throw e;
    }
}

export class PlaywrightVerificationFactory {
  private readonly page: Page;
  private readonly testInfo: TestInfo;

  /**
   * @param page - The Playwright Page instance.
   * @param testInfo - The Playwright TestInfo instance.
   */
  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
  }

  public async verifyTitle(expectedTitle: string): Promise<void> {
    await safeStep(`🧪 Verifying page title: ${expectedTitle}`, async (): Promise<void> => {
      const actualTitle = await this.page.title();
      const message = `Expected Title: ${expectedTitle} and Actual Title: ${actualTitle}`;
      await this.testInfo.attach(`🧪 ${message}`, {
        body: message,
        contentType: 'text/plain',
      });
      expect(actualTitle, message).toBe(expectedTitle);
    });
  }

  public async waitForDomLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  public async waitForSec(seconds: number): Promise<void> {
    await safeStep(`⏳ Waiting for ${seconds} second(s)`, async (): Promise<void> => {
      await this.page.waitForTimeout(seconds * 1000); // Convexc rt seconds to milliseconds
      await this.testInfo.attach(`⏳ Waited for ${seconds} second(s)`, {
        body: `Waited for ${seconds} second(s)`,
        contentType: 'text/plain',
      });
    });
  }

  public async waitForSelector(locatorInfo: LocatorInfo, timeout: number = 30000): Promise<void> {
    await safeStep(`⏳ Waiting for "${locatorInfo.description}" to be visible`, async (): Promise<void> => {
      await locatorInfo.locator.waitFor({ state: 'attached', timeout });
      await this.testInfo.attach(`⏳ "${locatorInfo.description}" is visible`, {
        body: `⏳ "${locatorInfo.description}" is visible`,
        contentType: 'text/plain',
      });
    });
  }

  public async waitForElementToDisappear(element: LocatorInfo, timeout: number = 30000): Promise<void> {
    await safeStep(`⏳ Waiting for the ${element.description} to disappear`, async (): Promise<void> => {
      // Wait for the  element to either become hidden or be removed from the DOM
      await element.locator.waitFor({ state: 'detached', timeout });

      await this.testInfo.attach(`✅ "${element.description}" has disappeared`, {
        body: `✅ "${element.description}" has disappeared`,
        contentType: 'text/plain',
      });
    });
  }

  public async verifyLocatorsCount(locatorInfo: LocatorInfo, count: number): Promise<void> {
    await safeStep(`⏳ Verifying if ${locatorInfo.description} contains ${count} visible suggestions`, async (): Promise<void> => {
      await locatorInfo.locator.first().scrollIntoViewIfNeeded();

      const elements = await locatorInfo.locator.all();
      let visibleCount = 0;
      for (const element of elements) {
        if (await element.isVisible()) {
          visibleCount++;
        }
      }
      if (visibleCount >= count) {
        await this.testInfo.attach(`✅ ${locatorInfo.description} has at least ${count} visible elements`, {
          body: `✅ ${locatorInfo.description} has ${visibleCount} visible suggestions which is greater than or equal to ${count}.`,
          contentType: 'text/plain',
        });
      } else {
        throw new Error(
          `${locatorInfo.description} does not have enough visible suggestions. Expected at least ${count}, but found ${visibleCount}`,
        );
      }
    });
  }

  public async verifyValue(locatorInfo: LocatorInfo, expectedValue: string): Promise<void> {
    await safeStep(`🧪 Verifying if "${locatorInfo.description}" value is displayed as expected`, async (): Promise<void> => {
      const actualValue: string = await locatorInfo.locator.inputValue();
      if (actualValue === expectedValue) {
        await this.embedFullPageScreenshot(
          `✅ "${locatorInfo.description}" value is displayed as Expected = "${expectedValue}" ; Actual = "${actualValue}" - Screenshot`,
        );
        await this.testInfo.attach(
          `✅ "${locatorInfo.description}" value is displayed as Expected = "${expectedValue}" ; Actual = "${actualValue}"`,
          {
            body: `✅ "${locatorInfo.description}" value is displayed as expected = "${expectedValue}" ; actual = "${actualValue}"`,
            contentType: 'text/plain',
          },
        );
      } else {
        await this.embedFullPageScreenshot(
          `💥 "${locatorInfo.description}" value is NOT displayed. Expected = "${expectedValue}" ; Actual = "${actualValue}" - Screenshot`,
        );
        await this.testInfo.attach(
          `💥 "${locatorInfo.description}" value is NOT displayed. Expected = "${expectedValue}" ; Actual = "${actualValue}"`,
          {
            body: `💥 "${locatorInfo.description}" value is NOT displayed as expected = "${expectedValue}" ; actual = "${actualValue}"`,
            contentType: 'text/plain',
          },
        );
      }
      await expect.soft(locatorInfo.locator).toHaveValue(expectedValue);
    });
  }

  public async verifyText(locatorInfo: LocatorInfo, strExpectedText: string, mask: boolean = false): Promise<void> {
    const displayedText = mask ? this.maskValue(strExpectedText) : strExpectedText;

    await safeStep(`🧪 Verifying if "${locatorInfo.description}" text is displayed as expected`, async (): Promise<void> => {
      const actualText: null | string = await this.getText(locatorInfo);

      if (actualText?.includes(strExpectedText)) {
        await this.embedFullPageScreenshot(
          `✅ "${locatorInfo.description}" text is displayed as Expected = "${displayedText}" ; Actual = "${actualText}" - Screenshot`,
        );
        await this.testInfo.attach(
          `✅ "${locatorInfo.description}" text is displayed as Expected = "${displayedText}" ; Actual = "${actualText}"`,
          {
            body: `✅ "${locatorInfo.description}" text is displayed as expected = "${displayedText}" ; actual = "${actualText}"`,
            contentType: 'text/plain',
          },
        );
      } else {
        await this.embedFullPageScreenshot(
          `💥 "${locatorInfo.description}" text is NOT displayed as Expected = "${displayedText}" ; Actual = "${actualText}" - Screenshot`,
        );
        await this.testInfo.attach(
          `💥 "${locatorInfo.description}" text is NOT displayed as Expected = "${displayedText}" ; Actual = "${actualText}"`,
          {
            body: `💥 "${locatorInfo.description}" text is NOT displayed as expected = "${displayedText}" ; actual = "${actualText}"`,
            contentType: 'text/plain',
          },
        );
      }

      await expect.soft(locatorInfo.locator).toContainText(strExpectedText);
    });
  }

  public async verifyPdfContent(pdfLinkLocator: LocatorInfo, expectedText: string): Promise<void> {
    const pdfUrl = await pdfLinkLocator.locator.getAttribute('href');

    if (!pdfUrl) {
      throw new Error('Failed to get the PDF URL from the link.');
    }

    if (!fs.existsSync('./downloads')) {
      fs.mkdirSync('./downloads');
    }

    const response = await this.page.request.get(pdfUrl!);
    const filePath = './downloads/temp.pdf';
    fs.writeFileSync(filePath, await response.body());

    const pdfData = await PdfParse(fs.readFileSync(filePath));

    const normalizeText = (text: string): string =>
      text
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s:/]/g, '')
        .trim();

    const actualText = normalizeText(pdfData.text);
    const normalizedExpectedText = normalizeText(expectedText);

    await safeStep('🧪 Verifying PDF content', async (): Promise<void> => {
      try {
        await expect(actualText).toContain(normalizedExpectedText);
      } finally {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });
  }

  public async waitForVisibility(locatorInfo: LocatorInfo, timeout: number = 30000): Promise<void> {
    await safeStep(`⏳ Waiting for "${locatorInfo.description}" to be visible`, async (): Promise<void> => {
      await locatorInfo.locator.waitFor({ state: 'visible', timeout });
      await this.testInfo.attach(`⏳ "${locatorInfo.description}" is visible`, {
        body: `⏳ "${locatorInfo.description}" is visible`,
        contentType: 'text/plain',
      });
    });
  }

  public async expectElementExist(locatorInfo: LocatorInfo): Promise<void> {
    await safeStep(`🧪 Verifying if "${locatorInfo.description}" exists`, async (): Promise<void> => {
      const isVisible = await locatorInfo.locator.isVisible();
      if (isVisible) {
        await this.embedFullPageScreenshot(`✅ "${locatorInfo.description}" exists and is visible - Screenshot`);
        await this.testInfo.attach(`✅ "${locatorInfo.description}" exists and is visible`, {
          body: `✅ "${locatorInfo.description}" exists and is visible`,
          contentType: 'text/plain',
        });
      } else {
        await this.embedFullPageScreenshot(
          `💥 "${locatorInfo.description}" does NOT exist or is not visible - Screenshot`,
        );
        await this.testInfo.attach(`💥 "${locatorInfo.description}" does NOT exist or is not visible`, {
          body: `💥 "${locatorInfo.description}" does NOT exist or is not visible`,
          contentType: 'text/plain',
        });
      }
      await expect(locatorInfo.locator).toBeVisible();
    });
  }

  public async verifyNotExist(locatorInfo: LocatorInfo): Promise<void> {
    await safeStep(`🧪 Verifying if "${locatorInfo.description}" does NOT exist`, async (): Promise<void> => {
      const isVisible = await locatorInfo.locator.isVisible();
      if (isVisible) {
        await this.embedFullPageScreenshot(`💥 "${locatorInfo.description}" exists when it should NOT - Screenshot`);
        await this.testInfo.attach(`💥 "${locatorInfo.description}" exists when it should NOT`, {
          body: `💥 "${locatorInfo.description}" exists when it should NOT`,
          contentType: 'text/plain',
        });

        // Fail the test if the element is visible
        throw new Error(`❌ "${locatorInfo.description}" was found but it should NOT exist.`);
      } else {
        await this.embedFullPageScreenshot(`✅ "${locatorInfo.description}" does NOT exist - Screenshot`);
        await this.testInfo.attach(`✅ "${locatorInfo.description}" does NOT exist`, {
          body: `✅ "${locatorInfo.description}" does NOT exist`,
          contentType: 'text/plain',
        });
      }

      await expect(locatorInfo.locator).toBeHidden();
    });
  }

  public async verifyContains(haystack: string, needle: string, message?: string): Promise<void> {
    const isContained = haystack.includes(needle);

    await safeStep(`🧪 Verifying if actual : "${haystack}" contains the expected : "${needle}"`, async () => {
      await this.testInfo.attach(
        isContained
          ? `✅ "${haystack}" contains the expected substring: "${needle}"`
          : `💥 "${haystack}" does NOT contain the expected substring: "${needle}"`,
        {
          body: message || `Expected "${needle}" to be found in "${haystack}"`,
          contentType: 'text/plain',
        },
      );

      expect(isContained, message || `Expected "${needle}" to be found in "${haystack}"`).toBeTruthy();
    });
  }

  public async assertAreEqual(
    expected: number | number[] | string | string[],
    actual: number | number[] | string | string[],
    message?: string,
  ): Promise<void> {
    await safeStep(`🧪 Verifying if "${expected}" equals "${actual}"`, async (): Promise<void> => {
      try {
        await expect(actual, message).toEqual(expected);

        // ✅ Log success and attach screenshot
        await this.embedFullPageScreenshot('✅ Assertion passed - Screenshot');
        await this.testInfo.attach('✅ Assertion Passed', {
          body: `✅ Expected: "${expected}"\n✅ Actual: "${actual}"`,
          contentType: 'text/plain',
        });
      } catch (error) {
        const errorMessage = `💥 Assertion failed: Expected "${expected}", but got "${actual}"`;

        // 💥 Capture a screenshot and attach the failure message
        await this.embedFullPageScreenshot('💥 Assertion failed - Screenshot');
        await this.testInfo.attach('💥 Assertion Failed', {
          body: errorMessage,
          contentType: 'text/plain',
        });

        // Re-throw error to ensure the test fails
        throw new Error(errorMessage);
      }
    });
  }

  public async assertAreNotEqual(
    expected: number | number[] | string | string[],
    actual: number | number[] | string | string[],
    message?: string,
  ): Promise<void> {
    await safeStep(`🧪 Verifying if "${expected}" does not equal "${actual}"`, async (): Promise<void> => {
      try {
        await expect(actual, message).not.toEqual(expected);

        // ✅ Log success and attach screenshot
        await this.embedFullPageScreenshot('✅ Assertion passed - Screenshot');
        await this.testInfo.attach('✅ Assertion Passed', {
          body: `✅ Expected: "${expected}" not to equal "${actual}"`,
          contentType: 'text/plain',
        });
      } catch (error) {
        const errorMessage = `💥 Assertion failed: Expected "${expected}" not to equal "${actual}"`;

        // 💥 Capture a screenshot and attach the failure message
        await this.embedFullPageScreenshot('💥 Assertion failed - Screenshot');
        await this.testInfo.attach('💥 Assertion Failed', {
          body: errorMessage,
          contentType: 'text/plain',
        });

        // Re-throw error to ensure the test fails
        throw new Error(errorMessage);
      }
    });
  }

  public async assertAreTrue(actual: boolean, message?: string): Promise<void> {
    await safeStep('🧪 Verifying if given value is true."', async (): Promise<void> => {
      expect(actual, message).toBeTruthy();
    });
  }

  //Retries the callback until all assertions within it pass or the timeout value is reached.
  public async expectToPass(assertion: () => Promise<void>, timeOut?: number): Promise<void> {
    await expect(async () => {
      await assertion();
    }).toPass(timeOut ? { timeout: timeOut } : {});
  }

  public async verifyRadioButtonIsChecked(locatorInfo: LocatorInfo): Promise<void> {
    await safeStep(`🐾 Verifying that the radio button: "${locatorInfo.description}" is checked/selected`, async (): Promise<void> => {
      try {
        // Wait for the element to be attached to the DOM and visible
        if (!(await locatorInfo.locator.isVisible())) {
          await locatorInfo.locator.waitFor({ state: 'attached', timeout: 2000 });
        }

        // Check if the radio button is checked
        await locatorInfo.locator.focus();
        const isChecked = await locatorInfo.locator.isChecked();

        // Attach the result of the check to the test report
        await this.testInfo.attach(`🐾 Radio Button "${locatorInfo.description}" Checked Status`, {
          body: `Radio Button "${locatorInfo.description}" is checked: ${isChecked}`,
          contentType: 'text/plain',
        });
        console.log('Logged status is what?  - ' + isChecked);
        // Assert the radio button is checked, if needed
        if (!isChecked) {
          throw new Error(`Radio button "${locatorInfo.description}" is not checked.`);
        }
      } catch (error) {
        // Error handling with meaningful message
        throw new Error(`Error while verifying the radio button "${locatorInfo.description}": ${error.message}`);
      }
    });
  }

  public async assertElementIsEnabled(locatorInfo: LocatorInfo, message?: string): Promise<void> {
    await safeStep(`🧪 Verifying if "${locatorInfo.description} is enabled." `, async (): Promise<void> => {
      await expect(locatorInfo.locator, message).toBeEnabled();
    });
  }

  public async assertElementIsDisabled(locatorInfo: LocatorInfo, message?: string): Promise<void> {
    await safeStep(`🧪 Verifying if "${locatorInfo.description} is disabled." `, async (): Promise<void> => {
      await expect(locatorInfo.locator, message).toBeDisabled();
    });
  }

  public async ExpectDelegateToPass(
    delegate: () => Promise<void>,
    stepMessage: string = '',
    errorMessage: string = '',
    options: { intervals?: number[]; timeout?: number } = {},
  ): Promise<void> {
    stepMessage = stepMessage === '' ? 'Verify delegate passes.' : stepMessage;
    const { intervals, timeout } = options;

    try {
      await expect(async () => {
        await delegate();
      }, stepMessage).toPass({
        intervals: intervals || undefined,
        timeout: timeout !== undefined ? timeout : 50000,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Timeout')) {
        throw new Error(`${errorMessage} and error: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  public async assertGreaterThanOrEqualTo(expected: number, actual: number, message?: string): Promise<void> {
    await safeStep(`🧪 Verifying if "${expected}" is greater than or equal to "${actual}"`, async (): Promise<void> => {
      await expect(actual, message).toBeGreaterThanOrEqual(expected);
    });
  }

  public async assertStringsEqual(actual: string, expected: string, message?: string): Promise<void> {
    await safeStep(`🧪 Verifying if "${actual}" matches expected string "${expected}"`, async (): Promise<void> => {
      await expect(actual, message).toContain(expected);
    });
  }

  public async assertGreaterThan(expected: number, actual: number, message?: string): Promise<void> {
    await safeStep(`🧪 Verifying if "${expected}" is greater than"${actual}"`, async (): Promise<void> => {
      await expect(expected, message).toBeGreaterThan(actual);
    });
  }

  public async assertElementHasClass(
    locatorInfo: LocatorInfo,
    className: ReadonlyArray<RegExp | string> | RegExp | string,
    message?: string,
  ): Promise<void> {
    await safeStep(`🧪 Verifying if "${locatorInfo.description} has class: ${className} present on it." `, async (): Promise<void> => {
      await expect(locatorInfo.locator, message).toHaveClass(className);
    });
  }

  public async assertElementTextContains(locatorInfo: LocatorInfo, expectedText: string): Promise<void> {
    await safeStep(`Verifying : ${locatorInfo.description} field is  displaying expected text `, async (): Promise<void> => {
      // Assert that the text matches
      try {
        await expect(locatorInfo.locator).toHaveText(expectedText);
        await this.testInfo.attach(`✅ Text assertion passed for "${locatorInfo.description}"`, {
          body: `✅ "${locatorInfo.description}" contains the expected text: "${expectedText}"`,
          contentType: 'text/plain',
        });
      } catch (error) {
        // Capture a screenshot and attach the failure message
        await this.embedFullPageScreenshot(`💥 Text assertion failed for "${locatorInfo.description}" - Screenshot`);
        await this.testInfo.attach(`💥 Text assertion failed for "${locatorInfo.description}"`, {
          body: `💥 "${locatorInfo.description}" did not contain the expected text: "${expectedText}"`,
          contentType: 'text/plain',
        });
        //throw error; // Re-throw the error to fail the test
      }
    });
  }

  public async assertElementValueContains(locatorInfo: LocatorInfo, expectedText: string): Promise<void> {
    await safeStep(`Verifying : ${locatorInfo.description} field is  having expected Value `, async (): Promise<void> => {
      // Assert that the text matches
      try {
        await expect(locatorInfo.locator).toHaveValue(expectedText);
        await this.testInfo.attach(`✅ Text assertion passed for "${locatorInfo.description}"`, {
          body: `✅ "${locatorInfo.description}" contains the expected value: "${expectedText}"`,
          contentType: 'text/plain',
        });
      } catch (error) {
        // Capture a screenshot and attach the failure message
        await this.embedFullPageScreenshot(`💥 Text assertion failed for "${locatorInfo.description}" - Screenshot`);
        await this.testInfo.attach(`💥 Text assertion failed for "${locatorInfo.description}"`, {
          body: `💥 "${locatorInfo.description}" did not contain the expected value: "${expectedText}"`,
          contentType: 'text/plain',
        });
        //throw error; // Re-throw the error to fail the test
      }
    });
  }

  public async embedFullPageScreenshot(description: string): Promise<void> {
    await safeStep(`📸 "${description} - Full page screenshot`.trim(), async (): Promise<void> => {
      const screenshot: Buffer = await this.page.screenshot({ fullPage: true });
      await this.testInfo.attach(`📸 ${description}`, {
        body: screenshot,
        contentType: 'image/png',
      });
    });
  }

  public async waitForLoaderToDisappear(timeout: number = 30000): Promise<void> {
    const loaderLocator = this.page.locator("//div[@class='loading__inner']/p[normalize-space()='Just a moment']");

    await safeStep('⏳ Waiting for the loader "Just a moment" to disappear', async (): Promise<void> => {
      // Wait for the loader element to either become hidden or be removed from the DOM
      await loaderLocator.waitFor({ state: 'hidden', timeout });

      await this.testInfo.attach('✅ Loader "Just a moment" has disappeared', {
        body: '✅ Loader "Just a moment" has disappeared',
        contentType: 'text/plain',
      });
    });
  }

  public async waitForProcessingLoaderToDisappear(timeout: number = 30000): Promise<void> {
    const loaderLocator = this.page.locator("//div[@class='loading__inner']/p[normalize-space()='processing']");

    await safeStep('⏳ Waiting for the processing loader to disappear', async (): Promise<void> => {
      // Wait for the loader element to either become hidden or be removed from the DOM
      await loaderLocator.waitFor({ state: 'hidden', timeout });

      await this.testInfo.attach('✅ Processing loader has disappeared', {
        body: '✅ Processing loader has disappeared',
        contentType: 'text/plain',
      });
    });
  }

  public maskValue(value: string): string {
    return '*'.repeat(value.length); // Masks the value with asterisks
  }

  public async getText(locatorInfo: LocatorInfo): Promise<null | string> {
    const elementTextContent = await safeStep(`🐾 "${locatorInfo.description}" text is obtained`, async (): Promise<
      null | string
    > => {
      return locatorInfo.locator.textContent();
    });
    return elementTextContent;
  }

  public async verifyFileDownload(locatorInfo: LocatorInfo, timeout: number = 30000): Promise<void> {
    await safeStep(`🧪 Verifying file download after clicking "${locatorInfo.description}"`, async (): Promise<void> => {
      // Wait for the download event
      const downloadPromise = this.page.waitForEvent('download', { timeout });

      // Click the element that triggers the download
      await locatorInfo.locator.click();

      // Wait for the download to complete
      const download = await downloadPromise;

      // Verify the download exists
      if (download) {
        await this.testInfo.attach(`✅ File download started from "${locatorInfo.description}"`, {
          body: `✅ File download started from "${locatorInfo.description}"`,
          contentType: 'text/plain',
        });
      } else {
        await this.testInfo.attach(`💥 No file download detected from "${locatorInfo.description}"`, {
          body: `💥 No file download detected from "${locatorInfo.description}"`,
          contentType: 'text/plain',
        });
        throw new Error(`No file download detected from "${locatorInfo.description}"`);
      }
    });
  }

  public async verifyUserHasAccess(expectedUrl: string, shouldMatch: boolean): Promise<void> {
    await safeStep(`Verifying URL ${shouldMatch ? 'matches' : 'does not match'} "${expectedUrl}"`, async () => {
      try {
        const currentUrl = this.page.url();
        if (shouldMatch) {
          await this.assertAreEqual(expectedUrl, currentUrl, 'User has access to the page');
        } else {
          if (currentUrl === expectedUrl) {
            throw new Error('User should not have access to the page');
          }
        }
      } catch (error) {
        await this.testInfo.attach('💥 Failed to verify URL match status', {
          body: `Error: ${error.message}`,
          contentType: 'text/plain',
        });
        throw new Error(`Failed to verify access match status: ${error.message}`);
      }
    });
  }

  public async verifyDropdownValues(inputText: string, expectedValues: string[]): Promise<void> {
    await safeStep(`🐾 Verifying dropdown values for ${inputText}`, async (): Promise<void> => {
      try {
        const inputLocator = this.page.locator(`//input[@placeholder="${inputText}"]`);
        await inputLocator.click();

        const dropdownOptionsLocator = this.page.locator(
          `//input[@placeholder="${inputText}"]/ancestor::div[contains(@class, "form-element")]//ul/li`,
        );
        await dropdownOptionsLocator.first().waitFor({ state: 'visible', timeout: 2000 });

        const optionsCount = await dropdownOptionsLocator.count();

        // Throw error if count doesn't match
        if (optionsCount !== expectedValues.length) {
          throw new Error(
            `Number of dropdown options (${optionsCount}) does not match expected values length (${expectedValues.length})`,
          );
        }

        // Now verify each value exists
        for (const value of expectedValues) {
          const optionLocator = this.page.locator(
            `//input[@placeholder="${inputText}"]/ancestor::div[contains(@class, "form-element")]//ul/li[normalize-space()="${value}"]`,
          );

          // Check if element exists
          const exists = await optionLocator.isVisible();
          if (!exists) {
            throw new Error(`Value "${value}" not found in dropdown`);
          }
        }
      } catch (error) {
        await this.testInfo.attach('💥 Failed to verify dropdown values', {
          body: `Error: ${error.message}`,
          contentType: 'text/plain',
        });
        throw error;
      }
    });
  }

  public async isElementVisible(locatorInfo: LocatorInfo): Promise<boolean> {
    let result = false;

    await safeStep(`🧪 Checking visibility of: "${locatorInfo.description}"`, async () => {
      try {
        result = await locatorInfo.locator.isVisible();
        if (result) {
          await this.testInfo.attach('Element visibility check', {
            body: `✅ Element "${locatorInfo.description}" is visible.`,
            contentType: 'text/plain',
          });
        } else {
          await this.testInfo.attach('Element visibility check', {
            body: `⚠️ Element "${locatorInfo.description}" is NOT visible.`,
            contentType: 'text/plain',
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.testInfo.attach('❌ Error while checking element visibility', {
          body: `Error while checking visibility of "${locatorInfo.description}": ${errorMessage}`,
          contentType: 'text/plain',
        });
      }
    });

    return result;
  }
  public async logOrderNumber(locatorInfo: LocatorInfo, label: string): Promise<void> {
    const orderNumber = (await locatorInfo.locator.textContent()) ?? 'Order number not found';
    await this.testInfo.attach(label, {
        body: orderNumber,
        contentType: 'text/plain'
    });
    console.log(`✅ ${label}: ${orderNumber}`);
}
}
