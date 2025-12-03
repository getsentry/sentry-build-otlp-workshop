import { config } from 'dotenv';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'sentry-build-otlp-workshop-api',
  [SEMRESATTRS_SERVICE_VERSION]: packageJson.version,
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// Direct mode: App sends directly to Sentry (single project)
// Headers are automatically parsed from OTEL_EXPORTER_OTLP_TRACES_HEADERS env var by the exporter
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
});

const logExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
});

console.log('📡 Mode: DIRECT (SDK → Sentry)');
console.log('📡 Exporting to:', process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  logRecordProcessors: [new BatchLogRecordProcessor(logExporter)],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Too noisy
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingPaths: ['/health'],
        ignoreIncomingRequestHook: (req) => {
          // Ignore OPTIONS requests (CORS preflight)
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
      '@opentelemetry/instrumentation-redis-4': {
        enabled: true,
      },
    }),
  ],
});

sdk.start();

// Uncomment for debug logging:
// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

console.log('🔭 OpenTelemetry instrumentation initialized');
console.log(`📊 Service: ${resource.attributes[SEMRESATTRS_SERVICE_NAME]}`);
console.log(`🏷️  Version: ${resource.attributes[SEMRESATTRS_SERVICE_VERSION]}`);
console.log(`🌍 Environment: ${resource.attributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('🛑 OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.error('❌ Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});
