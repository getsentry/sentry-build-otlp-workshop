"""
Python E-commerce Service with Sentry OTLP Integration

This service demonstrates OpenTelemetry instrumentation with Sentry's
OTLP integration for a Python microservice.
"""

import os
import time
import random
import psycopg2
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

# Load environment variables
load_dotenv()

# IMPORTANT: Initialize instrumentation BEFORE creating Flask app
from instrument import initialize_instrumentation, get_tracer

initialize_instrumentation()

# Now create Flask app
app = Flask(__name__)
CORS(app)

# Get tracer for manual instrumentation
tracer = get_tracer()


# Database connection
def get_db_connection():
    """Get PostgreSQL database connection"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL not set in environment")

    return psycopg2.connect(database_url)


# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint with database connectivity test"""
    health_status = {
        'service': 'python-service',
        'status': 'healthy',
        'timestamp': time.time(),
    }

    # Check database connection
    try:
        with tracer.start_as_current_span("database.health_check") as span:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT NOW()')
            result = cursor.fetchone()
            cursor.close()
            conn.close()

            health_status['database'] = 'connected'
            health_status['database_timestamp'] = str(result[0])
            span.set_status(Status(StatusCode.OK))

    except Exception as e:
        health_status['database'] = 'disconnected'
        health_status['error'] = str(e)
        health_status['status'] = 'degraded'

    return jsonify(health_status), 200


# Get inventory/stock information
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    """Get inventory/stock information for all products"""

    with tracer.start_as_current_span("inventory.get_all") as span:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # Query products with stock information
            cursor.execute("""
                SELECT id, name, price, stock_quantity, category
                FROM products
                ORDER BY name
            """)

            columns = [desc[0] for desc in cursor.description]
            products = []

            for row in cursor.fetchall():
                product = dict(zip(columns, row))

                # Add inventory status
                stock = product['stock_quantity']
                if stock == 0:
                    product['inventory_status'] = 'out_of_stock'
                elif stock < 10:
                    product['inventory_status'] = 'low_stock'
                else:
                    product['inventory_status'] = 'in_stock'

                products.append(product)

            cursor.close()
            conn.close()

            span.set_attribute("inventory.product_count", len(products))
            span.set_status(Status(StatusCode.OK))

            return jsonify({
                'products': products,
                'total_count': len(products),
            }), 200

        except Exception as e:
            span.set_status(Status(StatusCode.ERROR))
            span.record_exception(e)
            return jsonify({'error': str(e)}), 500


# Update inventory for a product
@app.route('/api/inventory/<int:product_id>', methods=['PUT'])
def update_inventory(product_id):
    """Update stock quantity for a product"""

    with tracer.start_as_current_span("inventory.update") as span:
        span.set_attribute("product.id", product_id)

        try:
            data = request.get_json()
            new_quantity = data.get('stock_quantity')

            if new_quantity is None:
                return jsonify({'error': 'stock_quantity is required'}), 400

            conn = get_db_connection()
            cursor = conn.cursor()

            # Update stock quantity
            cursor.execute("""
                UPDATE products
                SET stock_quantity = %s
                WHERE id = %s
                RETURNING id, name, stock_quantity
            """, (new_quantity, product_id))

            result = cursor.fetchone()

            if not result:
                cursor.close()
                conn.close()
                return jsonify({'error': 'Product not found'}), 404

            conn.commit()
            cursor.close()
            conn.close()

            span.set_attribute("inventory.new_quantity", new_quantity)
            span.set_status(Status(StatusCode.OK))

            return jsonify({
                'id': result[0],
                'name': result[1],
                'stock_quantity': result[2],
            }), 200

        except Exception as e:
            span.set_status(Status(StatusCode.ERROR))
            span.record_exception(e)
            return jsonify({'error': str(e)}), 500


# Get low stock alerts
@app.route('/api/inventory/alerts', methods=['GET'])
def get_low_stock_alerts():
    """Get products with low stock (< 10 items)"""

    with tracer.start_as_current_span("inventory.low_stock_alerts") as span:
        try:
            threshold = int(request.args.get('threshold', 10))
            span.set_attribute("inventory.threshold", threshold)

            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, name, price, stock_quantity, category
                FROM products
                WHERE stock_quantity < %s AND stock_quantity > 0
                ORDER BY stock_quantity ASC
            """, (threshold,))

            columns = [desc[0] for desc in cursor.description]
            low_stock_products = [dict(zip(columns, row)) for row in cursor.fetchall()]

            cursor.close()
            conn.close()

            span.set_attribute("inventory.alert_count", len(low_stock_products))
            span.set_status(Status(StatusCode.OK))

            return jsonify({
                'low_stock_products': low_stock_products,
                'count': len(low_stock_products),
                'threshold': threshold,
            }), 200

        except Exception as e:
            span.set_status(Status(StatusCode.ERROR))
            span.record_exception(e)
            return jsonify({'error': str(e)}), 500


# Simulate an error for testing Sentry error tracking
@app.route('/api/error', methods=['GET'])
def trigger_error():
    """Endpoint to test error tracking"""
    error_type = request.args.get('type', 'generic')

    with tracer.start_as_current_span("error.triggered") as span:
        span.set_attribute("error.type", error_type)

        if error_type == 'database':
            # Simulate database error
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM non_existent_table")

        elif error_type == 'division':
            # Simulate division by zero
            result = 100 / 0

        else:
            # Generic error
            raise Exception(f"Test error triggered: {error_type}")


# Distributed tracing example - call another service
@app.route('/api/distributed-trace', methods=['GET'])
def distributed_trace_example():
    """
    Example of distributed tracing across services.
    This endpoint calls another service (if available) to demonstrate
    trace propagation.
    """

    with tracer.start_as_current_span("distributed_trace.example") as span:
        try:
            # Simulate some work
            time.sleep(random.uniform(0.1, 0.3))

            # Try to call another service (e.g., products service)
            products_service_url = os.getenv('PRODUCTS_SERVICE_URL', 'http://localhost:3001')

            try:
                with tracer.start_as_current_span("http.call.products_service"):
                    # This will automatically propagate trace context
                    response = requests.get(
                        f"{products_service_url}/api/products",
                        timeout=5
                    )

                    span.set_attribute("products.status_code", response.status_code)
                    span.set_attribute("products.product_count", len(response.json()))

            except requests.exceptions.RequestException as e:
                span.set_attribute("products.error", str(e))
                # Don't fail the whole request if other service is unavailable

            span.set_status(Status(StatusCode.OK))

            return jsonify({
                'message': 'Distributed trace example completed',
                'python_service': 'completed',
                'products_service': 'called' if 'response' in locals() else 'unavailable',
            }), 200

        except Exception as e:
            span.set_status(Status(StatusCode.ERROR))
            span.record_exception(e)
            return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 3003))
    print('')
    print('═══════════════════════════════════════════════════════════')
    print('🐍 Python E-commerce Service (Sentry OTLP)')
    print('═══════════════════════════════════════════════════════════')
    print(f'📡 Server listening on port {port}')
    print(f'🌍 Environment: {os.getenv("ENVIRONMENT", "development")}')
    print(f'🔗 API URL: http://localhost:{port}')
    print(f'💚 Health Check: http://localhost:{port}/health')
    print('')
    print('📊 Available Endpoints:')
    print('   GET  /api/inventory          - Get all products inventory')
    print('   PUT  /api/inventory/:id      - Update product stock')
    print('   GET  /api/inventory/alerts   - Get low stock alerts')
    print('   GET  /api/error              - Trigger test error')
    print('   GET  /api/distributed-trace  - Test distributed tracing')
    print('═══════════════════════════════════════════════════════════')
    print('')

    app.run(host='0.0.0.0', port=port, debug=True)
