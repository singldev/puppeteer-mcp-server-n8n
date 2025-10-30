# Changelog

## [Unreleased]

### Added
- Environment-based configuration management with support for:
  - `PORT`: Server port (default: 8000)
  - `BROWSER_HEADLESS`: Browser headless mode toggle (default: true)
  - `PAGE_TIMEOUT`: Page operation timeout (default: 30000ms)
  - `NAVIGATION_TIMEOUT`: Navigation timeout (default: 30000ms)
  - `LOG_LEVEL`: Logging level (default: info)
- `.env.example` template with documented defaults
- Health check endpoint at `/health` for monitoring server status
- Enhanced `puppeteer_connect_active_tab` with support for connecting to existing Chrome instances via:
  - `webSocketDebuggerUrl`: Direct WebSocket URL for Chrome DevTools Protocol
  - `debuggerPort`: Local port number to auto-discover WebSocket URL
  - `targetUrl`: Filter tabs by URL pattern
  - `resetLogs`: Clear console logs on connection
- New Puppeteer tools:
  - `puppeteer_wait_for_selector`: Wait for elements to appear
  - `puppeteer_get_page_content`: Get HTML content of current page
  - `puppeteer_get_element_text`: Extract text content from elements
  - `puppeteer_element_exists`: Check element presence
  - `puppeteer_get_page_title`: Get page title
  - `puppeteer_get_current_url`: Get current URL
  - `puppeteer_get_screenshot`: Retrieve saved screenshots
  - `puppeteer_get_console_logs`: Get captured console logs with pagination
- Screenshot storage with named retrieval
- Console log capture from browser (max 200 entries)
- Better browser launch options with additional performance flags

### Changed
- Improved error handling with proper validation and type safety
- Enhanced screenshot tool to support custom dimensions and element selection
- Better fill field implementation that properly clears existing values
- Improved logging with structured information
- Updated TypeScript configuration to ES2020 with stricter checks
- Enhanced README with comprehensive documentation
- Removed unused code and files (resources/handlers.ts)

### Fixed
- Type safety issues by replacing `any` types with proper types
- Screenshot tool now properly respects width and height parameters
- Better input validation for all tools
- Improved error messages with more context

### Technical Improvements
- Added TypeScript strict mode checks (noUnusedLocals, noUnusedParameters, etc.)
- Source maps and declaration maps for better debugging
- JSON request body size limit (1mb)
- Better error handlers for JSON parsing and unexpected errors
- Proper graceful shutdown handling
