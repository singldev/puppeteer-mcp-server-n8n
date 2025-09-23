import { CallToolResult, TextContent, ImageContent } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../config/logger.js";
import { BrowserState } from "../types/global.js";
import { 
  ensureBrowser, 
  getDebuggerWebSocketUrl, 
  connectToExistingBrowser,
  getCurrentPage 
} from "../browser/connection.js";
import { notifyConsoleUpdate, notifyScreenshotUpdate } from "../resources/handlers.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export async function handleToolCall(
  name: string, 
  args: any, 
  state: BrowserState,
  server: Server
): Promise<CallToolResult> {
  logger.info('Tool call received', { tool: name, arguments: args });
  const page = await ensureBrowser();

  let result: CallToolResult;

  switch (name) {
    case "puppeteer_connect_active_tab":
      try {
        const wsEndpoint = await getDebuggerWebSocketUrl(args.debugPort);
        const connectedPage = await connectToExistingBrowser(
          wsEndpoint, 
          args.targetUrl,
          (logEntry) => {
            state.consoleLogs.push(logEntry);
            notifyConsoleUpdate(server);
          }
        );
        const url = await connectedPage.url();
        const title = await connectedPage.title();
        result = {
          content: [{
            type: "text",
            text: `Successfully connected to browser\\nActive webpage: ${title} (${url})`,
          }],
          isError: false,
        };
      } catch (error) {
        const errorMessage = (error as Error).message;
        const isConnectionError = errorMessage.includes('connect to Chrome debugging port') || 
                                errorMessage.includes('Target closed');
        
        result = {
          content: [{
            type: "text",
            text: `Failed to connect to browser: ${errorMessage}\\n\\n` +
                  (isConnectionError ? 
                    "To connect to Chrome:\\n" +
                    "1. Close Chrome completely\\n" +
                    "2. Reopen Chrome with remote debugging enabled:\\n" +
                    "   Windows: chrome.exe --remote-debugging-port=9222\\n" +
                    "   Mac: /Applications/Google\\\\ Chrome.app/Contents/MacOS/Google\\\\ Chrome --remote-debugging-port=9222\\n" +
                    "3. Navigate to your desired webpage\\n" +
                    "4. Try the operation again" : 
                    "Please check if Chrome is running and try again.")
          }],
          isError: true,
        };
      }
      break;

    case "puppeteer_navigate":
      try {
        logger.info('Navigating to URL', { url: args.url });
        const response = await page.goto(args.url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        if (!response) {
          throw new Error('Navigation failed - no response received');
        }

        const status = response.status();
        if (status >= 400) {
          throw new Error(`HTTP error: ${status} ${response.statusText()}`);
        }

        logger.info('Navigation successful', { url: args.url, status });
        result = {
          content: [{
            type: "text",
            text: `Successfully navigated to ${args.url} (Status: ${status})`,
          }],
          isError: false,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Navigation failed', { url: args.url, error: errorMessage });
        result = {
          content: [{
            type: "text",
            text: `Navigation failed: ${errorMessage}\\nThis could be due to:\\n- Network connectivity issues\\n- Site blocking automated access\\n- Page requiring authentication\\n- Navigation timeout\\n\\nTry using a different URL or checking network connectivity.`,
          }],
          isError: true,
        };
      }
      break;

    case "puppeteer_screenshot": {
      const width = args.width ?? 800;
      const height = args.height ?? 600;
      await page.setViewport({ width, height });

      const screenshot = await (args.selector ?
        (await page.$(args.selector))?.screenshot({ encoding: "base64" }) :
        page.screenshot({ encoding: "base64", fullPage: false }));

      if (!screenshot) {
        result = {
          content: [{
            type: "text",
            text: args.selector ? `Element not found: ${args.selector}` : "Screenshot failed",
          }],
          isError: true,
        };
      } else {
        state.screenshots.set(args.name, screenshot);
        notifyScreenshotUpdate(server);

        result = {
          content: [
            {
              type: "text",
              text: `Screenshot '${args.name}' taken at ${width}x${height}`,
            } as TextContent,
            {
              type: "image",
              data: screenshot,
              mimeType: "image/png",
            } as ImageContent,
          ],
          isError: false,
        };
      }
      break;
    }

    case "puppeteer_click":
      try {
        await page.click(args.selector);
        result = {
          content: [{
            type: "text",
            text: `Clicked: ${args.selector}`,
          }],
          isError: false,
        };
      } catch (error) {
        result = {
          content: [{
            type: "text",
            text: `Failed to click ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }
      break;

    case "puppeteer_fill":
      try {
        await page.waitForSelector(args.selector);
        await page.type(args.selector, args.value);
        result = {
          content: [{
            type: "text",
            text: `Filled ${args.selector} with: ${args.value}`,
          }],
          isError: false,
        };
      } catch (error) {
        result = {
          content: [{
            type: "text",
            text: `Failed to fill ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }
      break;

    case "puppeteer_select":
      try {
        await page.waitForSelector(args.selector);
        await page.select(args.selector, args.value);
        result = {
          content: [{
            type: "text",
            text: `Selected ${args.selector} with: ${args.value}`,
          }],
          isError: false,
        };
      } catch (error) {
        result = {
          content: [{
            type: "text",
            text: `Failed to select ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }
      break;

    case "puppeteer_hover":
      try {
        await page.waitForSelector(args.selector);
        await page.hover(args.selector);
        result = {
          content: [{
            type: "text",
            text: `Hovered ${args.selector}`,
          }],
          isError: false,
        };
      } catch (error) {
        result = {
          content: [{
            type: "text",
            text: `Failed to hover ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }
      break;

    case "puppeteer_evaluate":
      try {
        // Set up console listener
        const logs: string[] = [];
        const consoleListener = (message: any) => {
          logs.push(`${message.type()}: ${message.text()}`);
        };
        
        page.on('console', consoleListener);
        
        // Execute script with proper serialization
        logger.debug('Executing script in browser', { scriptLength: args.script.length });
        
        // Wrap the script in a function that returns a serializable result
        const evalResult = await page.evaluate(`(async () => {
          try {
            const result = (function() { ${args.script} })();
            return result;
          } catch (e) {
            console.error('Script execution error:', e.message);
            return { error: e.message };
          }
        })()`);
        
        // Remove the listener to avoid memory leaks
        page.off('console', consoleListener);
        
        logger.debug('Script execution result', {
          resultType: typeof evalResult,
          hasResult: evalResult !== undefined,
          logCount: logs.length
        });

        result = {
          content: [{
            type: "text",
            text: `Execution result:\\n${JSON.stringify(evalResult, null, 2)}\\n\\nConsole output:\\n${logs.join('\\n')}`,
          }],
          isError: false,
        };
      } catch (error) {
        logger.error('Script evaluation failed', { error: error instanceof Error ? error.message : String(error) });
        result = {
          content: [{
            type: "text",
            text: `Script execution failed: ${error instanceof Error ? error.message : String(error)}\\n\\nPossible causes:\\n- Syntax error in script\\n- Execution timeout\\n- Browser security restrictions\\n- Serialization issues with complex objects`,
          }],
          isError: true,
        };
      }
      break;

    default:
      result = {
        content: [{
          type: "text",
          text: `Unknown tool: ${name}`,
        }],
        isError: true,
      };
  }
  logger.info('Tool call result', { result });
  return result;
}