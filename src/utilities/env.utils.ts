import * as dotenv from 'dotenv';
import type { BrowserContextOptions } from '@playwright/test';

const envType = process.env.ENV_TYPE || 'prod';
dotenv.config({ path: `./src/config/.env.${envType}` });

export function getEnvVariable(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

export function getHttpCredentials(): BrowserContextOptions['httpCredentials'] {
  const authURL = process.env.authURL;
  if (!authURL) {
    return undefined;
  }

  try {
    const parsed = new URL(authURL);
    if (!parsed.username) {
      return undefined;
    }
    return {
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  } catch {
    return undefined;
  }
}

export function getBaseURL(): string {
  const parsed = new URL(getEnvVariable('authURL'));
  parsed.username = '';
  parsed.password = '';
  return parsed.origin;
}

export function getContextOptions(): BrowserContextOptions {
  const httpCredentials = getHttpCredentials();
  return {
    ignoreHTTPSErrors: true,
    ...(httpCredentials ? { httpCredentials } : {}),
  };
}
