import express from 'express';
import type { Request, Response, ErrorRequestHandler } from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import { logger } from './config/logger.js';
import { getEnvironmentConfig } from './config/environment.js';
import { TOOLS } from './tools/definitions.js';
import { handleToolCall } from './tools/handlers.js';
import { BrowserState } from './types/global.js';
import { closeBrowser } from './browser/connection.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const state: BrowserState = {
  consoleLogs: [],
  screenshots: new Map(),
  lastNavigationUrl: undefined,
};

async function gracefulShutdown() {
  logger.info("Puppeteer MCP Server closing");
  await closeBrowser();
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

function isCallToolResult(value: unknown): value is CallToolResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'content' in value
  );
}

const jsonParseErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const parseError = err as SyntaxError & { status?: number; type?: string };
  if (
    parseError instanceof SyntaxError &&
    parseError.status === 400 &&
    parseError.type === 'entity.parse.failed'
  ) {
    logger.warn('Invalid JSON payload received', { path: req.path, method: req.method });
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' },
      id: null,
    });
  }

  return next(err);
};

const unexpectedErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error('Unhandled error while processing request', {
    path: req.path,
    method: req.method,
    message,
    stack: err instanceof Error ? err.stack : undefined,
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    jsonrpc: '2.0',
    error: { code: -32603, message: 'Internal server error' },
    id: null,
  });
};

export async function runServer() {
  try {
    const config = getEnvironmentConfig();
    const app = express();

    app.use(bodyParser.json({ limit: '1mb' }));
    app.use(jsonParseErrorHandler);

    const httpServer = http.createServer(app);

    app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        config: {
          port: config.port,
          browserHeadless: config.browserHeadless,
          pageTimeout: config.pageTimeout,
          navigationTimeout: config.navigationTimeout,
          logLevel: config.logLevel,
        },
        stats: {
          consoleLogsCount: state.consoleLogs.length,
          screenshotsCount: state.screenshots.size,
          lastNavigationUrl: state.lastNavigationUrl ?? null,
        },
      });
    });

    app.post('/', async (req: Request, res: Response) => {
      const body = (req.body ?? {}) as {
        jsonrpc?: unknown;
        method?: unknown;
        params?: unknown;
        id?: unknown;
      };

      const { jsonrpc, method, params, id } = body;
      const requestId = id ?? null;

      if (jsonrpc !== '2.0') {
        logger.warn('Invalid JSON-RPC version received', { jsonrpc, id: requestId });
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Invalid Request' },
          id: requestId,
        });
      }

      if (typeof method !== 'string') {
        logger.warn('Invalid JSON-RPC method received', { method, id: requestId });
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Invalid method' },
          id: requestId,
        });
      }

      logger.info('JSON-RPC request received', { method, id: requestId });

      let result: unknown;

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
        case 'tools/call': {
          if (!params || typeof params !== 'object') {
            logger.warn('Invalid params for tools/call', { params });
            return res.status(400).json({
              jsonrpc: '2.0',
              error: { code: -32602, message: 'Invalid params' },
              id: requestId,
            });
          }

          const { name, arguments: args } = params as {
            name?: unknown;
            arguments?: unknown;
          };

          if (typeof name !== 'string') {
            logger.warn('Invalid tool name received', { name });
            return res.status(400).json({
              jsonrpc: '2.0',
              error: { code: -32602, message: 'Tool name must be a string' },
              id: requestId,
            });
          }

          const safeArgs =
            args && typeof args === 'object'
              ? (args as Record<string, unknown>)
              : {};

          const toolResult = await handleToolCall(name, safeArgs, state);
          result = toolResult;
          break;
        }
        case 'notifications/initialized':
          logger.info('Client reported initialization complete', { id: requestId });
          return res.status(204).send();
        default:
          logger.warn('Unsupported JSON-RPC method requested', { method, id: requestId });
          return res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32601, message: 'Method not found' },
            id: requestId,
          });
      }

      const isErrorResponse =
        isCallToolResult(result) ? Boolean(result.isError) : false;

      const responsePayload = { jsonrpc: '2.0', result, id: requestId };
      logger.info('JSON-RPC response prepared', {
        method,
        id: requestId,
        isError: isErrorResponse,
      });

      return res.json(responsePayload);
    });

    app.use(unexpectedErrorHandler);

    httpServer.listen(config.port, () => {
      logger.info(`MCP server started successfully on port ${config.port}`, {
        port: config.port,
        browserHeadless: config.browserHeadless,
        pageTimeout: config.pageTimeout,
        navigationTimeout: config.navigationTimeout,
        logLevel: config.logLevel,
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}
