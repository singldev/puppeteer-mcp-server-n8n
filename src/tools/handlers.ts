import type { Page } from "puppeteer";
import { CallToolResult, TextContent, ImageContent } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../config/logger.js";
import { BrowserState } from "../types/global.js";
import { ensureBrowser, connectToExistingBrowser, getDebuggerWebSocketUrl } from "../browser/connection.js";
import { getEnvironmentConfig } from "../config/environment.js";

const MAX_CONSOLE_LOG_ENTRIES = 200;

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  state: BrowserState
): Promise<CallToolResult> {
  logger.info('Tool call received', { tool: name, arguments: args });

  const config = getEnvironmentConfig();

  const pushConsoleLog = (log: string) => {
    state.consoleLogs.push(log);
    if (state.consoleLogs.length > MAX_CONSOLE_LOG_ENTRIES) {
      state.consoleLogs.splice(0, state.consoleLogs.length - MAX_CONSOLE_LOG_ENTRIES);
    }
    logger.debug('Console log captured from browser', { log });
  };

  const getPage = async (): Promise<Page> => {
    const page = await ensureBrowser();
    if (page.listenerCount('console') === 0) {
      page.on('console', (msg) => {
        pushConsoleLog(msg.text());
      });
    }
    return page;
  };

  let result: CallToolResult;

  try {
    switch (name) {
      case "puppeteer_connect_active_tab": {
        const resetLogs = args.resetLogs === true;
        if (resetLogs) {
          state.consoleLogs.length = 0;
        }

        const webSocketDebuggerUrl =
          typeof args.webSocketDebuggerUrl === 'string' ? args.webSocketDebuggerUrl : undefined;
        const debuggerPort =
          typeof args.debuggerPort === 'number' ? args.debuggerPort : undefined;
        const targetUrl =
          typeof args.targetUrl === 'string' ? args.targetUrl : undefined;

        if (webSocketDebuggerUrl || debuggerPort) {
          let wsEndpoint = webSocketDebuggerUrl;
          if (!wsEndpoint && debuggerPort) {
            wsEndpoint = await getDebuggerWebSocketUrl(debuggerPort);
          }

          const connectedPage = await connectToExistingBrowser(
            wsEndpoint as string,
            targetUrl,
            (log) => pushConsoleLog(log),
          );

          connectedPage.setDefaultTimeout(config.pageTimeout);
          connectedPage.setDefaultNavigationTimeout(config.navigationTimeout);

          state.lastNavigationUrl = connectedPage.url();

          result = {
            content: [{
              type: "text",
              text: `Connected to existing browser session${targetUrl ? ` matching "${targetUrl}"` : ''}.`,
            }],
            isError: false,
          };
        } else {
          await getPage();
          result = {
            content: [{
              type: "text",
              text: "Successfully ensured browser instance is running.",
            }],
            isError: false,
          };
        }
        break;
      }
      case "puppeteer_navigate": {
        if (!args.url || typeof args.url !== 'string') {
          throw new Error('URL is required and must be a string');
        }
        const page = await getPage();
        await page.goto(args.url, { waitUntil: 'networkidle0' });
        state.lastNavigationUrl = args.url;
        result = {
          content: [{
            type: "text",
            text: `Successfully navigated to ${args.url}`,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_screenshot": {
        const page = await getPage();
        const name = args.name;
        if (!name || typeof name !== 'string') {
          throw new Error('Screenshot name is required and must be a string');
        }

        const selector = typeof args.selector === 'string' ? args.selector : undefined;
        const width = typeof args.width === 'number' ? args.width : undefined;
        const height = typeof args.height === 'number' ? args.height : undefined;

        const originalViewport = page.viewport();
        const shouldAdjustViewport = width !== undefined || height !== undefined;

        if (shouldAdjustViewport) {
          await page.setViewport({
            width: width ?? originalViewport?.width ?? 1280,
            height: height ?? originalViewport?.height ?? 720,
            deviceScaleFactor: originalViewport?.deviceScaleFactor ?? 1,
            hasTouch: originalViewport?.hasTouch ?? false,
            isLandscape: width !== undefined && height !== undefined
              ? width >= height
              : originalViewport?.isLandscape ?? true,
          });
        }

        let screenshotBase64: string;

        if (selector) {
          const element = await page.$(selector);
          if (!element) {
            throw new Error(`Element with selector "${selector}" was not found`);
          }
          screenshotBase64 = await element.screenshot({ encoding: "base64" }) as string;
        } else {
          screenshotBase64 = await page.screenshot({ encoding: "base64" }) as string;
        }

        if (shouldAdjustViewport && originalViewport) {
          await page.setViewport(originalViewport);
        }

        state.screenshots.set(name, screenshotBase64);

        result = {
          content: [
            {
              type: "text",
              text: `Screenshot "${name}" captured${selector ? ` for selector ${selector}` : ''}.`,
            } as TextContent,
            {
              type: "image",
              data: screenshotBase64,
              mimeType: "image/png",
            } as ImageContent,
          ],
          isError: false,
        };
        break;
      }
      case "puppeteer_get_screenshot": {
        const name = args.name;
        if (!name || typeof name !== 'string') {
          throw new Error('Screenshot name is required and must be a string');
        }

        const screenshotData = state.screenshots.get(name);
        if (!screenshotData) {
          throw new Error(`Screenshot with name "${name}" not found`);
        }

        result = {
          content: [
            {
              type: "text",
              text: `Retrieved screenshot: ${name}`,
            } as TextContent,
            {
              type: "image",
              data: screenshotData,
              mimeType: "image/png",
            } as ImageContent,
          ],
          isError: false,
        };
        break;
      }
      case "puppeteer_click": {
        if (!args.selector || typeof args.selector !== 'string') {
          throw new Error('Selector is required and must be a string');
        }
        const page = await getPage();
        await page.click(args.selector);
        result = {
          content: [{
            type: "text",
            text: `Clicked element with selector: ${args.selector}`,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_fill": {
        if (!args.selector || typeof args.selector !== 'string') {
          throw new Error('Selector is required and must be a string');
        }
        if (args.value === undefined || typeof args.value !== 'string') {
          throw new Error('Value is required and must be a string');
        }
        const page = await getPage();
        await page.focus(args.selector);
        await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (!element) {
            throw new Error(`Element with selector "${sel}" not found`);
          }
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.value = '';
          } else if ((element as HTMLElement).isContentEditable) {
            (element as HTMLElement).innerText = '';
          }
        }, args.selector);
        await page.type(args.selector, args.value as string);
        result = {
          content: [{
            type: "text",
            text: `Filled element with selector "${args.selector}" with value: "${args.value}"`,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_select": {
        if (!args.selector || typeof args.selector !== 'string') {
          throw new Error('Selector is required and must be a string');
        }
        if (args.value === undefined || typeof args.value !== 'string') {
          throw new Error('Value is required and must be a string');
        }
        const page = await getPage();
        await page.select(args.selector, args.value as string);
        result = {
          content: [{
            type: "text",
            text: `Selected value "${args.value}" in selector: ${args.selector}`,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_hover": {
        if (!args.selector || typeof args.selector !== 'string') {
          throw new Error('Selector is required and must be a string');
        }
        const page = await getPage();
        await page.hover(args.selector);
        result = {
          content: [{
            type: "text",
            text: `Hovered over element with selector: ${args.selector}`,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_evaluate": {
        if (!args.script || typeof args.script !== 'string') {
          throw new Error('Script is required and must be a string');
        }
        const page = await getPage();
        const evalResult = await page.evaluate(args.script as string);
        result = {
          content: [{
            type: "text",
            text: JSON.stringify(evalResult, null, 2),
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_wait_for_selector": {
        if (!args.selector || typeof args.selector !== 'string') {
          throw new Error('Selector is required and must be a string');
        }
        const page = await getPage();
        const timeout = typeof args.timeout === 'number' ? args.timeout : config.pageTimeout;
        await page.waitForSelector(args.selector, { timeout });
        result = {
          content: [{
            type: "text",
            text: `Element with selector "${args.selector}" found on the page`,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_get_page_content": {
        const page = await getPage();
        const content = await page.content();
        result = {
          content: [{
            type: "text",
            text: content,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_get_element_text": {
        if (!args.selector || typeof args.selector !== 'string') {
          throw new Error('Selector is required and must be a string');
        }
        const page = await getPage();
        const text = await page.$eval(args.selector, (el) => el.textContent ?? '');
        result = {
          content: [{
            type: "text",
            text,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_element_exists": {
        if (!args.selector || typeof args.selector !== 'string') {
          throw new Error('Selector is required and must be a string');
        }
        const page = await getPage();
        const element = await page.$(args.selector);
        const exists = element !== null;
        result = {
          content: [{
            type: "text",
            text: JSON.stringify({ exists, selector: args.selector }),
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_get_page_title": {
        const page = await getPage();
        const title = await page.title();
        result = {
          content: [{
            type: "text",
            text: title,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_get_current_url": {
        const page = await getPage();
        const url = page.url();
        result = {
          content: [{
            type: "text",
            text: url,
          }],
          isError: false,
        };
        break;
      }
      case "puppeteer_get_console_logs": {
        const limitRaw = typeof args.limit === 'number' ? Math.floor(args.limit) : 50;
        const limit = limitRaw > 0 ? limitRaw : 50;
        const sinceIndexRaw = typeof args.sinceIndex === 'number' ? Math.floor(args.sinceIndex) : 0;
        const sinceIndex = Math.max(0, sinceIndexRaw);
        const logs = state.consoleLogs.slice(sinceIndex, sinceIndex + limit);
        const nextIndex = Math.min(state.consoleLogs.length, sinceIndex + logs.length);
        result = {
          content: [{
            type: "text",
            text: JSON.stringify({
              logs,
              totalCount: state.consoleLogs.length,
              returnedCount: logs.length,
              sinceIndex,
              nextIndex,
            }, null, 2),
          }],
          isError: false,
        };
        break;
      }
      default:
        result = {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Tool call error', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    result = {
      content: [{
        type: "text",
        text: `Error: ${errorMessage}`,
      }],
      isError: true,
    };
  }

  logger.info('Tool call completed', { tool: name, success: !result.isError });
  return result;
}
