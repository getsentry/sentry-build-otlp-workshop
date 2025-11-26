#!/usr/bin/env node

/**
 * Downloads and runs the OpenTelemetry Collector without Docker
 * Usage: node scripts/run-collector.js [start|stop]
 */

import { spawn, exec } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import https from 'https';
import { promisify } from 'util';
import { createGunzip } from 'zlib';
import { x as tarExtract } from 'tar';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const COLLECTOR_VERSION = '0.140.0';
const COLLECTOR_DIR = join(rootDir, '.otel-collector');
const PID_FILE = join(COLLECTOR_DIR, 'collector.pid');
const LOG_FILE = join(COLLECTOR_DIR, 'collector.log');

// Detect platform and architecture
function getPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  let osPart, archPart;

  if (platform === 'darwin') {
    osPart = 'darwin';
  } else if (platform === 'linux') {
    osPart = 'linux';
  } else if (platform === 'win32') {
    osPart = 'windows';
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  if (arch === 'x64') {
    archPart = 'amd64';
  } else if (arch === 'arm64') {
    archPart = 'arm64';
  } else {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  return { os: osPart, arch: archPart };
}

function getCollectorUrl() {
  const { os, arch } = getPlatform();
  const extension = os === 'windows' ? '.zip' : '.tar.gz';

  return `https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${COLLECTOR_VERSION}/otelcol-contrib_${COLLECTOR_VERSION}_${os}_${arch}${extension}`;
}

function getBinaryPath() {
  const { os } = getPlatform();
  const extension = os === 'windows' ? '.exe' : '';
  return join(COLLECTOR_DIR, `otelcol-contrib${extension}`);
}

async function downloadCollector() {
  const url = getCollectorUrl();
  const binaryPath = getBinaryPath();
  const tarPath = join(COLLECTOR_DIR, 'collector.tar.gz');

  console.log('📥 Downloading OpenTelemetry Collector...');
  console.log(`   Version: ${COLLECTOR_VERSION}`);
  console.log(`   URL: ${url}`);

  // Download the tar.gz file
  await new Promise((resolve, reject) => {
    const followRedirect = (targetUrl) => {
      https.get(targetUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          followRedirect(response.headers.location);
        } else if (response.statusCode === 200) {
          const fileStream = createWriteStream(tarPath);
          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            console.log('✅ Downloaded successfully, extracting...');
            resolve();
          });

          fileStream.on('error', reject);
        } else {
          reject(new Error(`Download failed with status ${response.statusCode}`));
        }
      }).on('error', reject);
    };

    followRedirect(url);
  });

  // Extract the binary
  try {
    await tarExtract({
      file: tarPath,
      cwd: COLLECTOR_DIR,
    });

    // Make executable
    chmodSync(binaryPath, 0o755);

    // Clean up tar file
    unlinkSync(tarPath);

    console.log('✅ Collector ready');
  } catch (error) {
    throw new Error(`Failed to extract collector: ${error.message}`);
  }
}

async function ensureCollector() {
  const binaryPath = getBinaryPath();

  if (!existsSync(COLLECTOR_DIR)) {
    mkdirSync(COLLECTOR_DIR, { recursive: true });
  }

  if (!existsSync(binaryPath)) {
    await downloadCollector();
  } else {
    console.log('✅ Collector binary already exists');
  }
}

function isCollectorRunning() {
  if (!existsSync(PID_FILE)) {
    return false;
  }

  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());

    // Check if process is running
    if (process.platform === 'win32') {
      // Windows
      try {
        execSync(`tasklist /FI "PID eq ${pid}" | find "${pid}"`, { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    } else {
      // Unix-like
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    }
  } catch (error) {
    return false;
  }
}

async function startCollector() {
  if (isCollectorRunning()) {
    console.log('⚠️  Collector is already running');
    console.log('   Run "npm run collector:stop" to stop it first');
    return;
  }

  await ensureCollector();

  const binaryPath = getBinaryPath();
  const configPath = join(rootDir, 'collector-config.yaml');

  if (!existsSync(configPath)) {
    console.error(`❌ Error: ${configPath} not found`);
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

  // Ensure required env vars are set for multi-project routing
  const requiredVars = [
    'SENTRY_PRODUCTS_OTLP_ENDPOINT',
    'SENTRY_PRODUCTS_AUTH',
    'SENTRY_ORDERS_OTLP_ENDPOINT',
    'SENTRY_ORDERS_AUTH',
    'SENTRY_DEFAULT_OTLP_ENDPOINT',
    'SENTRY_DEFAULT_AUTH',
  ];

  const missingVars = requiredVars.filter(v => !envVars[v]);
  if (missingVars.length > 0) {
    console.error('❌ Error: Missing required environment variables for collector mode:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\n   See .env.example for configuration details');
    process.exit(1);
  }

  console.log('🚀 Starting OpenTelemetry Collector (Multi-Project Routing)...');
  console.log(`   Config: ${configPath}`);
  console.log('   Routes: service.name → Sentry Project');
  console.log('     - products-service → Products Project');
  console.log('     - orders-service → Orders Project');
  console.log('     - (other) → Default Project');

  const logStream = createWriteStream(LOG_FILE, { flags: 'a' });

  // Wait for the log stream to open
  await new Promise((resolve, reject) => {
    logStream.on('open', resolve);
    logStream.on('error', reject);
  });

  const collector = spawn(binaryPath, ['--config', configPath], {
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
    console.log('✅ Collector started successfully');
    console.log(`   PID: ${collector.pid}`);
    console.log('   HTTP: http://localhost:4318');
    console.log('   gRPC: http://localhost:4317');
    console.log('   Health: http://localhost:13133');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Start products service: npm run collector:products');
    console.log('   2. Start orders service: npm run collector:orders');
    console.log('');
    console.log(`📋 View logs: npm run collector:logs`);
  } else {
    console.error('❌ Collector failed to start. Check logs:');
    console.error(`   tail -f ${LOG_FILE}`);
    process.exit(1);
  }
}

async function stopCollector() {
  if (!isCollectorRunning()) {
    console.log('⚠️  Collector is not running');
    return;
  }

  const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());

  console.log(`🛑 Stopping collector (PID: ${pid})...`);

  try {
    if (process.platform === 'win32') {
      // Windows
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      // Unix-like
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
    }

    console.log('✅ Collector stopped');
  } catch (error) {
    console.error('❌ Error stopping collector:', error.message);
  }
}

// Main
const command = process.argv[2];

if (command === 'start') {
  startCollector().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
} else if (command === 'stop') {
  stopCollector().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
} else {
  console.error('Usage: node scripts/run-collector.js [start|stop]');
  process.exit(1);
}
