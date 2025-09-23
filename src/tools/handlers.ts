import { CallToolResult, TextContent, ImageContent } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../config/logger.js";
import { BrowserState } from "../types/global.js";
import { 
  ensureBrowser, 
  closeBrowser
} from "../browser/connection.js";

export async function handleToolCall(
  name: string, 
  args: any, 
  state: BrowserState
): Promise<CallToolResult> {
  logger.info('Tool call received', { tool: name, arguments: args });
  
  let result: CallToolResult;

  try {
    const page = await ensureBrowser();
    switch (name) {
      case "puppeteer_connect_active_tab":
        result = {
          content: [{
            type: "text",
            text: "Successfully connected to browser.",
          }],
          isError: false,
        };
        break;
      case "puppeteer_navigate":
        await page.goto(args.url, { waitUntil: 'networkidle0' });
        result = {
          content: [{
            type: "text",
            text: `Successfully navigated to ${args.url}`,
          }],
          isError: false,
        };
        break;
      case "puppeteer_screenshot":
        const screenshot = await page.screenshot({ encoding: "base64" });
        result = {
          content: [
            {
              type: "text",
              text: "Screenshot taken",
            } as TextContent,
            {
              type: "image",
              data: screenshot,
              mimeType: "image/png",
            } as ImageContent,
          ],
          isError: false,
        };
        break;
      case "puppeteer_click":
        await page.click(args.selector);
        result = {
          content: [{
            type: "text",
            text: `Clicked ${args.selector}`,
          }],
          isError: false,
        };
        break;
      case "puppeteer_fill":
        await page.type(args.selector, args.value);
        result = {
          content: [{
            type: "text",
            text: `Filled ${args.selector}`,
          }],
          isError: false,
        };
        break;
      case "puppeteer_select":
        await page.select(args.selector, args.value);
        result = {
          content: [{
            type: "text",
            text: `Selected ${args.selector}`,
          }],
          isError: false,
        };
        break;
      case "puppeteer_hover":
        await page.hover(args.selector);
        result = {
          content: [{
            type: "text",
            text: `Hovered ${args.selector}`,
          }],
          isError: false,
        };
        break;
      case "puppeteer_evaluate":
        const evalResult = await page.evaluate(args.script);
        result = {
          content: [{
            type: "text",
            text: JSON.stringify(evalResult),
          }],
          isError: false,
        };
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
  } catch (e: any) {
    logger.error('Tool call error', { error: e.message });
    result = {
      content: [{
        type: "text",
        text: e.message,
      }],
      isError: true,
    };
  }

  logger.info('Tool call result', { result });
  return result;
}