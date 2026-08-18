import { Locator } from '@playwright/test';

export interface LocatorInfo {
  locator: Locator;
  description: string;
}