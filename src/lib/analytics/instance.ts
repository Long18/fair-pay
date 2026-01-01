import { AnalyticsManager } from './manager';
import { VercelAnalyticsProvider } from './providers/vercel';
import type { AnalyticsConfig } from './types';

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

const config: AnalyticsConfig = {
  enabled: isProduction,
  environment: isProduction ? 'production' : isDevelopment ? 'development' : 'test',
  debug: isDevelopment,
};

export const analyticsManager = new AnalyticsManager(config);

const vercelProvider = new VercelAnalyticsProvider(config);
analyticsManager.registerProvider('vercel', vercelProvider);

export { AnalyticsManager } from './manager';
export { VercelAnalyticsProvider } from './providers/vercel';
export * from './types';
export * from './trackers';
