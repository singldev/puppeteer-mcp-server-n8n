import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../config/logger.js';

let browser: Browser | null = null;
let page: Page | null = null;

export async function ensureBrowser(): Promise<Page> {
  if (!browser) {
    logger.info('Launching new browser instance');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
  }
  if (!page) {
    page = await browser.newPage();
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
  const data = await response.json();
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