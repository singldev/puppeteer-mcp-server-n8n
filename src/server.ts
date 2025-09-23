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
import { URL } from "url";

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
    const transports = new Map<string, SSEServerTransport>();

    app.use((req, res, next) => {
      logger.info(`Request: ${req.method} ${req.url}`);
      next();
    });

    app.get('/', (req, res) => {
      const transport = new SSEServerTransport('/', res);
      transports.set(transport.sessionId, transport);
      server.connect(transport);
      res.on('close', () => {
        transports.delete(transport.sessionId);
      });
    });

    app.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing sessionId');
        return;
      }
      const transport = transports.get(sessionId);
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Session not found');
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