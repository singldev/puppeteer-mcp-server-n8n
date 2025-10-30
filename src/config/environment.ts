export interface EnvironmentConfig {
  port: number;
  browserHeadless: boolean;
  pageTimeout: number;
  navigationTimeout: number;
  logLevel: string;
}

export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8000,
    browserHeadless: process.env.BROWSER_HEADLESS !== 'false',
    pageTimeout: process.env.PAGE_TIMEOUT ? parseInt(process.env.PAGE_TIMEOUT, 10) : 30000,
    navigationTimeout: process.env.NAVIGATION_TIMEOUT ? parseInt(process.env.NAVIGATION_TIMEOUT, 10) : 30000,
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}
