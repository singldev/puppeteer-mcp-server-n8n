import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./config/logger.js";
import { TOOLS } from "./tools/definitions.js";
import { handleToolCall } from "./tools/handlers.js";
import { setupResourceHandlers } from "./resources/handlers.js";
import { BrowserState } from "./types/global.js";
import { closeBrowser } from "./browser/connection.js";
import express from 'express';
import http from 'http';

// Initialize global state
const state: BrowserState = {
  consoleLogs: [],
  screenshots: new Map(),
};

// Create and configure server
const server = new Server(
  {
    name: "example-servers/puppeteer-n8n",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Setup resource handlers
setupResourceHandlers(server, state);

// Setup tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(request.params.name, request.params.arguments ?? {}, state, server)
);

async function gracefulShutdown() {
  logger.info("Puppeteer MCP Server closing");
  await closeBrowser();
  await server.close();
  process.exit(0);
}

// Handle server shutdown
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Start the server
export async function runServer() {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
    const app = express();
    const httpServer = http.createServer(app);

    app.get('/mcp', (req, res) => {
      const transport = new SSEServerTransport('/mcp', res);
      server.connect(transport);
      transport.start();
    });

    app.post('/mcp', express.raw({ type: 'application/json' }), async (req, res) => {
      const transport = server.transport as SSEServerTransport;
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('MCP transport not initialized');
      }
    });

    httpServer.listen(port, () => {
      logger.info(`MCP server started successfully on port ${port}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}