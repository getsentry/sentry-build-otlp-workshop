import { config } from 'dotenv';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { logs as logsAPI } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: 'orders-service',
  [SEMRESATTRS_SERVICE_VERSION]: packageJson.version,
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Multi-service mode always uses collector for routing
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

const logExporter = new OTLPLogExporter({
  url: 'http://localhost:4318/v1/logs',
});

// Initialize LoggerProvider
const loggerProvider = new LoggerProvider({ resource });
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

console.log('📡 Mode: MULTI-SERVICE (via COLLECTOR)');
console.log('📡 Service: orders-service');
console.log('📡 Exporting to: http://localhost:4318');

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingPaths: ['/health'],
        ignoreIncomingRequestHook: (req) => {
          return req.method === 'OPTIONS';
        },
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
        enhancedDatabaseReporting: true,
      },
    }),
  ],
});

sdk.start();

// Register the global LoggerProvider
logsAPI.setGlobalLoggerProvider(loggerProvider);

// Uncomment for debug logging:
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

console.log('🔭 OpenTelemetry instrumentation initialized');
console.log(`📊 Service: ${resource.attributes[SEMRESATTRS_SERVICE_NAME]}`);
console.log(`🏷️  Version: ${resource.attributes[SEMRESATTRS_SERVICE_VERSION]}`);
console.log(`🌍 Environment: ${resource.attributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  Promise.all([
    sdk.shutdown(),
    loggerProvider.shutdown(),
  ])
    .then(() => console.log('🛑 OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.error('❌ Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});
