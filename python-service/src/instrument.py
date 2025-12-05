"""
OpenTelemetry instrumentation with Sentry OTLP Integration

This module configures both OpenTelemetry SDK and Sentry SDK to send
trace data to Sentry using the OTLP protocol.
"""

import os
import sentry_sdk
from sentry_sdk.integrations.otlp import OTLPIntegration
from opentelemetry import trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor


def initialize_instrumentation():
    """
    Initialize both OpenTelemetry and Sentry instrumentation.

    The OTLPIntegration will automatically:
    - Set up a SpanExporter pointing to Sentry's OTLP endpoint
    - Configure context propagation for distributed tracing
    - Link traces to Sentry events (errors, logs, etc.)
    """

    # Get Sentry DSN from environment
    sentry_dsn = os.getenv('SENTRY_DSN')

    if not sentry_dsn:
        print("⚠️  WARNING: SENTRY_DSN not set. Sentry integration disabled.")
        print("   Set SENTRY_DSN in .env to enable Sentry OTLP integration")
        return

    # Initialize Sentry SDK with OTLP Integration
    sentry_sdk.init(
        dsn=sentry_dsn,

        # Enable OTLP Integration - this is the key part!
        # It automatically configures the OTLP exporter and propagator
        integrations=[
            OTLPIntegration(),
        ],

        # Collect user data (IP, headers) if applicable
        send_default_pii=True,

        # Enable logs to be sent to Sentry
        enable_logs=True,

        # Set traces sample rate (1.0 = 100% of traces)
        traces_sample_rate=1.0,

        # Set environment
        environment=os.getenv('ENVIRONMENT', 'development'),
    )

    print("✓ Sentry OTLP Integration initialized")
    print(f"  Service: {os.getenv('OTEL_SERVICE_NAME', 'python-service')}")
    print(f"  Environment: {os.getenv('ENVIRONMENT', 'development')}")

    # Auto-instrument Flask (will be applied when Flask app is created)
    FlaskInstrumentor()

    # Auto-instrument requests library for outgoing HTTP calls
    RequestsInstrumentor().instrument()

    print("✓ OpenTelemetry auto-instrumentation configured")
    print("  - Flask instrumentation enabled")
    print("  - Requests instrumentation enabled")


def get_tracer():
    """Get the OpenTelemetry tracer for manual instrumentation"""
    return trace.get_tracer(__name__)
