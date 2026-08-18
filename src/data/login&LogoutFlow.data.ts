import { LoginDetails, LogoutPage } from '@interfaces/login&LogoutFlow.interface';
import { TestCaseData } from '@interfaces/testcase.data.interface';

export interface LoginTestCaseData {
    testCaseData: TestCaseData;
    loginDetails: LoginDetails;
}
interface LogoutPageTestCaseData {
    testCaseData: TestCaseData;
    logoutPage: LogoutPage;
}

const loginTestData: { [key: string]: LoginTestCaseData } = {
    'AQ-132-Login': {
        loginDetails: {
            username: process.env.user_name || '',
            password: process.env.password || '',
        },
        testCaseData: {
            tags: '@p0 @smoke @login @AQ-132',
            testCase: 'AQ-132-Login-and-Logout-Flow',
            testDescription: 'validate the Admin user can login to the Application',
            testSummary: 'Admin User login',
        },
    },
};

const logoutPageTestCaseData: { [key: string]: LogoutPageTestCaseData } = {
    'AQ-132-Logout': {
        logoutPage: {
        },
        testCaseData: {
            tags: '@p0 @smoke @logout @AQ-132',
            testCase: 'AQ-132-Logout-Page',
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
