import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../config/logger.js';
import { getEnvironmentConfig } from '../config/environment.js';

let browser: Browser | null = null;
let page: Page | null = null;

export async function ensureBrowser(): Promise<Page> {
  const config = getEnvironmentConfig();
  
  if (!browser) {
    logger.info('Launching new browser instance', { headless: config.browserHeadless });
    browser = await puppeteer.launch({
      headless: config.browserHeadless,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    page = await browser.newPage();
    page.setDefaultTimeout(config.pageTimeout);
    page.setDefaultNavigationTimeout(config.navigationTimeout);
  }
  if (!page) {
    page = await browser.newPage();
    page.setDefaultTimeout(config.pageTimeout);
    page.setDefaultNavigationTimeout(config.navigationTimeout);
  }
  return page;
}

export async function closeBrowser() {
  if (browser) {
    logger.info('Closing browser instance');
    await browser.close();
    browser = null;
    page = null;
  }
}

export async function getDebuggerWebSocketUrl(port: number): Promise<string> {
  const response = await fetch(`http://127.0.0.1:${port}/json/version`);
  if (!response.ok) {
    throw new Error(`Failed to connect to Chrome debugging port ${port}. Status: ${response.status}`);
  }
  const data = await response.json() as { webSocketDebuggerUrl?: string };
  if (!data.webSocketDebuggerUrl) {
    throw new Error(`Chrome debugging endpoint did not provide a webSocketDebuggerUrl.`);
  }
  return data.webSocketDebuggerUrl;
}

export async function connectToExistingBrowser(
  wsEndpoint: string,
  targetUrl: string | undefined,
  onConsoleLog: (log: string) => void
): Promise<Page> {
  logger.info('Connecting to existing browser instance', { wsEndpoint });
  browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
  const pages = await browser.pages();
  
  if (targetUrl) {
    page = pages.find(p => p.url().includes(targetUrl)) ?? null;
  } else {
    page = pages[0] ?? null;
  }

  if (!page) {
    throw new Error('Could not find a suitable page to attach to.');
  }

  page.on('console', msg => {
    onConsoleLog(msg.text());
  });

  return page;
}

export function getCurrentPage(): Page | null {
  return page;
}