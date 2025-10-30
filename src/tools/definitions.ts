import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const TOOLS: Tool[] = [
  {
    name: "puppeteer_connect_active_tab",
    description: "Ensures connection to the browser instance managed by the server. Can optionally connect to an existing Chrome debugging session.",
    inputSchema: {
      type: "object",
      properties: {
        webSocketDebuggerUrl: {
          type: "string",
          description: "Full WebSocket debugger URL to connect to an existing Chrome instance",
        },
        debuggerPort: {
          type: "number",
          description: "Local Chrome debugging port, if a WebSocket URL is not provided",
        },
        targetUrl: {
          type: "string",
          description: "Partial URL used to select the tab to connect to when using an existing browser",
        },
        resetLogs: {
          type: "boolean",
          description: "Resets the in-memory console logs before establishing the connection",
        },
      },
      required: [],
    },
  },
  {
    name: "puppeteer_navigate",
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
      },
      required: ["url"],
    },
  },
  {
    name: "puppeteer_screenshot",
    description: "Take a screenshot of the current page or a specific element",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the screenshot" },
        selector: { type: "string", description: "CSS selector for element to screenshot" },
        width: { type: "number", description: "Width in pixels (default: 800)" },
        height: { type: "number", description: "Height in pixels (default: 600)" },
      },
      required: ["name"],
    },
  },
  {
    name: "puppeteer_get_screenshot",
    description: "Retrieve a previously captured screenshot by name",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name used when the screenshot was captured" },
      },
      required: ["name"],
    },
  },
  {
    name: "puppeteer_click",
    description: "Click an element on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to click" },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_fill",
    description: "Fill out an input field",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for input field" },
        value: { type: "string", description: "Value to fill" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_select",
    description: "Select an element on the page with Select tag",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to select" },
        value: { type: "string", description: "Value to select" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_hover",
    description: "Hover an element on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to hover" },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_evaluate",
    description: "Execute JavaScript in the browser console",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" },
      },
      required: ["script"],
    },
  },
  {
    name: "puppeteer_wait_for_selector",
    description: "Wait for an element to appear on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector to wait for" },
        timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_get_page_content",
    description: "Get the HTML content of the current page",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "puppeteer_get_element_text",
    description: "Get the text content of an element",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_element_exists",
    description: "Check if an element exists on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector to check" },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_get_page_title",
    description: "Get the title of the current page",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "puppeteer_get_current_url",
    description: "Get the current page URL",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "puppeteer_get_console_logs",
    description: "Retrieve console logs captured from the browser",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of log entries to return (default: 50)" },
        sinceIndex: { type: "number", description: "Return logs after this index" }
      },
      required: [],
    },
  },
];