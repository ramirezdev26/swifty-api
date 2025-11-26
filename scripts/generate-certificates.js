#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CERTS_DIR = path.join(__dirname, '..', 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.crt');

function ensureCertsDirectory() {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
    console.log(`Created certificates directory: ${CERTS_DIR}`);
  }
}

function certificatesExist() {
  return fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH);
}

function generateCertificates() {
  console.log('Generating self-signed certificates...');

  try {
    const opensslCmd = `
      openssl req -x509 -newkey rsa:4096 -keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    `.trim();

    execSync(opensslCmd, { stdio: 'inherit' });

    if (process.platform !== 'win32') {
      execSync(`chmod 600 "${KEY_PATH}"`);
    }

    console.log('Certificates generated successfully!');
    console.log(`   Private key: ${KEY_PATH}`);
    console.log(`   Certificate: ${CERT_PATH}`);
    console.log('\nWARNING: These are self-signed certificates for development only!');
    console.log('   Do not use in production environments.');
  } catch (error) {
    console.error('Failed to generate certificates:', error.message);
    process.exit(1);
  }
}

function main() {
  console.log('Swifty API - Certificate Generator\n');

  ensureCertsDirectory();

  if (certificatesExist()) {
    console.log('Certificates already exist. Regenerating...\n');
  }

  generateCertificates();

  if (certificatesExist()) {
    console.log('\nCertificate generation completed successfully!');
  } else {
    console.error('\nCertificate generation failed!');
    process.exit(1);
  }
}

main();
