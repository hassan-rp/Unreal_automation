import { LoginDetails, LogoutPage } from '@interfaces/login&LogoutFlow.interface';
import { TestCaseData } from '@interfaces/testcase.data.interface';
import { getEnvVariable } from '@utilities/env.utils';

export interface LoginTestCaseData {
    testCaseData: TestCaseData;
    loginDetails: LoginDetails;
}
interface LogoutPageTestCaseData {
    testCaseData: TestCaseData;
    logoutPage: LogoutPage;
}

const loginTestData: { [key: string]: LoginTestCaseData } = {
    'AQ-134-Login': {
        loginDetails: {
            username: getEnvVariable('user_name'),
            password: getEnvVariable('password'),
        },
        testCaseData: {
            tags: '@p0 @smoke @login @AQ-134',
            testCase: 'AQ-134-Login-and-Logout-Flow',
            testDescription: 'validate the Admin user can login to the Application',
            testSummary: 'Admin User login',
        },
    },
};

const logoutPageTestCaseData: { [key: string]: LogoutPageTestCaseData } = {
    'AQ-134-Logout': {
        logoutPage: {
        },
        testCaseData: {
            tags: '@p0 @smoke @logout @AQ-134',
            testCase: 'AQ-134-Logout-Page',
            testDescription: 'Validate the Admin user can logout from the Application',
            testSummary: 'Admin User logins and logout',
        },
    },
};

export function getData(testCase: string): LoginTestCaseData {
    const data = loginTestData[testCase];
    if (!data) {
        throw new Error(`Test data not found for test case: ${testCase}`);
    }
    return data;
}

export function logoutPage(testCase: string): LogoutPageTestCaseData {
    const data = logoutPageTestCaseData[testCase];
    if (!data) {
        throw new Error(`Test data not found for test case: ${testCase}`);
    }
    return data;
}
