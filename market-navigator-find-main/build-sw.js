// Simple build script to inject timestamp into service worker
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const swPath = join(__dirname, 'public/sw.js');
const distSwPath = join(__dirname, 'dist/sw.js');

// Read the source SW file
let swContent = readFileSync(swPath, 'utf8');

// Replace placeholder with current timestamp
const timestamp = Date.now();
swContent = swContent.replace('__BUILD_TIMESTAMP__', timestamp.toString());

console.log(`[Build] Injecting timestamp ${timestamp} into service worker`);

// Write to dist folder
writeFileSync(distSwPath, swContent);

console.log('[Build] Service worker updated with build timestamp');
