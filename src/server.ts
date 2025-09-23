import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import { logger } from './config/logger.js';
import { TOOLS } from './tools/definitions.js';
import { handleToolCall } from './tools/handlers.js';
import { BrowserState } from './types/global.js';
import { closeBrowser } from './browser/connection.js';

const state: BrowserState = {
  consoleLogs: [],
  screenshots: new Map(),
};

async function gracefulShutdown() {
  logger.info("Puppeteer MCP Server closing");
  await closeBrowser();
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export async function runServer() {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
    const app = express();
    app.use(bodyParser.json());
    const httpServer = http.createServer(app);

    app.post('/', async (req, res) => {
      const { jsonrpc, method, params, id } = req.body;

      if (jsonrpc !== '2.0') {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id });
      }

      logger.info(`Request: ${method}`, { params });

      let result: any;
      switch (method) {
        case 'initialize':
          result = {
            protocolVersion: '2025-03-26',
            capabilities: { tools: {} },
            serverInfo: { name: 'puppeteer-mcp-server-n8n', version: '0.1.0' },
          };
          break;
        case 'tools/list':
          result = { tools: TOOLS };
          break;
        case 'tools/call':
          try {
            const { name, arguments: args } = params;
            const toolResult = await handleToolCall(name, args, state, null as any);
            result = { content: toolResult.content };
          } catch (e: any) {
            logger.error('Tool call error', { error: e.message });
            return res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: e.message }, id });
          }
          break;
        default:
          return res.status(404).json({ jsonrpc: '2.0', error: { code: -32601, message: 'Method not found' }, id });
      }

      const response = { jsonrpc: '2.0', result, id };
      logger.info('Response', { response });
      res.json(response);
    });

    httpServer.listen(port, () => {
      logger.info(`MCP server started successfully on port ${port}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}