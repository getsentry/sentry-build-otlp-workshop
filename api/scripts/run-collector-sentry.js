#!/usr/bin/env node

/**
 * Runs the OpenTelemetry Collector with the native Sentry exporter
 *
 * This script manages the collector built from the Sentry fork that includes
 * the new Sentry exporter (PR #45051) with:
 * - Native OTLP forwarding to Sentry
 * - Automatic project routing by service.name
 * - Auto-creation of Sentry projects
 * - Organization-level authentication
 *
 * Usage: node scripts/run-collector-sentry.js [start|stop]
 *
 * Required environment variables:
 *   SENTRY_ORG_SLUG    - Your Sentry organization slug
 *   SENTRY_AUTH_TOKEN  - Internal Integration token with project:read/write
 */

import { spawn, exec } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const COLLECTOR_DIR = join(rootDir, '.otel-collector');
const BINARY_PATH = join(COLLECTOR_DIR, 'otelcol-sentry');
const CONFIG_PATH = join(rootDir, 'collector-config-sentry.yaml');
const PID_FILE = join(COLLECTOR_DIR, 'collector-sentry.pid');
const LOG_FILE = join(COLLECTOR_DIR, 'collector-sentry.log');

function isCollectorRunning() {
  if (!existsSync(PID_FILE)) {
    return false;
  }

  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());

    // Check if process is running (Unix)
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      // Process not running, clean up stale PID file
      try {
        unlinkSync(PID_FILE);
      } catch {}
      return false;
    }
  } catch {
    return false;
  }
}

async function startCollector() {
  if (isCollectorRunning()) {
    console.log('  Collector (Sentry exporter) is already running');
    console.log('   Run "npm run sentry:stop" to stop it first');
    return;
  }

  // Check binary exists
  if (!existsSync(BINARY_PATH)) {
    console.error('  Error: Sentry collector binary not found');
    console.error(`   Expected at: ${BINARY_PATH}`);
    console.error('');
    console.error('   To build the collector:');
    console.error('   1. Clone: git clone --branch feat/sentryexporter https://github.com/getsentry/opentelemetry-collector-contrib.git');
    console.error('   2. Build: cd cmd/otelcontribcol && make genotelcontribcol && go build -o otelcol-sentry .');
    console.error('   3. Copy: cp otelcol-sentry to api/.otel-collector/');
    process.exit(1);
  }

  // Check config exists
  if (!existsSync(CONFIG_PATH)) {
    console.error(`  Error: ${CONFIG_PATH} not found`);
    process.exit(1);
  }

  // Load environment variables
  const envPath = join(rootDir, '.env');
  let envVars = { ...process.env };

  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
  }

  // Check required environment variables
  const requiredVars = ['SENTRY_ORG_SLUG', 'SENTRY_AUTH_TOKEN'];
  const missingVars = requiredVars.filter(v => !envVars[v]);

  if (missingVars.length > 0) {
    console.error('  Error: Missing required environment variables:');
    console.error('');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('');
    console.error('   Add these to your .env file:');
    console.error('   SENTRY_ORG_SLUG=your-org-slug');
    console.error('   SENTRY_AUTH_TOKEN=your-internal-integration-token');
    console.error('');
    console.error('   Get the auth token from:');
    console.error('   Sentry -> Settings -> Developer Settings -> Custom Integrations');
    console.error('   Create an Internal Integration with project:read and project:write scopes');
    console.error('');
    process.exit(1);
  }

  console.log('');
  console.log('  Starting OpenTelemetry Collector (Sentry Exporter)...');
  console.log(`   Config: ${CONFIG_PATH}`);
  console.log('   Mode: Native Sentry Exporter with Auto-Routing');
  console.log(`   Org: ${envVars.SENTRY_ORG_SLUG}`);
  console.log('   Auto-create projects: enabled');
  console.log('');
  console.log('   Features:');
  console.log('     - Native OTLP forwarding (no transformations)');
  console.log('     - Automatic routing by service.name');
  console.log('     - Projects created automatically in Sentry');
  console.log('     - Single auth token for all projects');
  console.log('');

  const logStream = createWriteStream(LOG_FILE, { flags: 'a' });

  // Wait for the log stream to open
  await new Promise((resolve, reject) => {
    logStream.on('open', resolve);
    logStream.on('error', reject);
  });

  const collector = spawn(BINARY_PATH, ['--config', CONFIG_PATH], {
    detached: true,
    stdio: ['ignore', logStream.fd, logStream.fd],
    env: envVars,
  });

  collector.unref();

  // Save PID
  writeFileSync(PID_FILE, collector.pid.toString());

  // Wait a bit to check if it started successfully
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (isCollectorRunning()) {
    console.log('  Collector started successfully');
    console.log(`   PID: ${collector.pid}`);
    console.log('   HTTP: http://localhost:4318');
    console.log('   gRPC: http://localhost:4317');
    console.log('   Health: http://localhost:13133');
    console.log('');
    console.log('  Next steps:');
    console.log('   1. Start services: npm run sentry:services');
    console.log('   2. Or start all: npm run demo:sentry');
    console.log('');
    console.log(`  View logs: tail -f ${LOG_FILE}`);
  } else {
    console.error('  Collector failed to start. Check logs:');
    console.error(`   tail -f ${LOG_FILE}`);
    process.exit(1);
  }
}

async function stopCollector() {
  if (!isCollectorRunning()) {
    console.log('  Collector (Sentry exporter) is not running');
    return;
  }

  const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());

  console.log(`  Stopping collector (PID: ${pid})...`);

  try {
    process.kill(pid, 'SIGTERM');

    // Wait for graceful shutdown
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!isCollectorRunning()) {
        break;
      }
    }

    // Force kill if still running
    if (isCollectorRunning()) {
      process.kill(pid, 'SIGKILL');
    }

    // Remove PID file
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }

    console.log('  Collector stopped');
  } catch (error) {
    console.error('  Error stopping collector:', error.message);
    if (existsSync(PID_FILE)) {
      try {
        unlinkSync(PID_FILE);
      } catch {}
    }
  }
}

async function showLogs() {
  if (!existsSync(LOG_FILE)) {
    console.log('  No logs found. Collector may not have been started yet.');
    return;
  }

  const { spawn } = await import('child_process');
  const tail = spawn('tail', ['-f', LOG_FILE], { stdio: 'inherit' });

  process.on('SIGINT', () => {
    tail.kill();
    process.exit(0);
  });
}

async function checkHealth() {
  try {
    const response = await fetch('http://localhost:13133');
    if (response.ok) {
      console.log('  Collector is healthy');
    } else {
      console.log(`  Collector health check failed: ${response.status}`);
    }
  } catch (error) {
    console.log('  Collector is not responding (may not be running)');
  }
}

// Main
const command = process.argv[2];

switch (command) {
  case 'start':
    startCollector().catch(error => {
      console.error('  Error:', error.message);
      process.exit(1);
    });
    break;
  case 'stop':
    stopCollector().catch(error => {
      console.error('  Error:', error.message);
      process.exit(1);
    });
    break;
  case 'logs':
    showLogs();
    break;
  case 'health':
    checkHealth();
    break;
  default:
    console.log('Usage: node scripts/run-collector-sentry.js [start|stop|logs|health]');
    console.log('');
    console.log('Commands:');
    console.log('  start   Start the collector with Sentry exporter');
    console.log('  stop    Stop the collector');
    console.log('  logs    Tail the collector logs');
    console.log('  health  Check collector health endpoint');
    process.exit(1);
}
