export interface BrowserState {
  consoleLogs: string[];
  screenshots: Map<string, string>;
  lastNavigationUrl?: string;
}
