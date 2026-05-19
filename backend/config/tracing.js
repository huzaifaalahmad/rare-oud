const logger = require('../utils/logger');

let sdk;

function initTracing() {
  if (process.env.OTEL_ENABLED !== 'true') return null;
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    sdk = new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME || 'rare-oud-api',
      traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
      instrumentations: [getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false }
      })]
    });
    sdk.start();
    logger.info('OpenTelemetry tracing initialized');
    return sdk;
  } catch (error) {
    logger.warn('OpenTelemetry requested but not available; continuing without tracing', { error: error.message });
    return null;
  }
}

async function shutdownTracing() {
  if (sdk) await sdk.shutdown().catch(error => logger.warn('OpenTelemetry shutdown failed', { error: error.message }));
}

module.exports = { initTracing, shutdownTracing };
