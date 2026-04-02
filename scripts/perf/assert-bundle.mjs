import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const budgetConfig = JSON.parse(
  readFileSync(new URL('./performance-budgets.json', import.meta.url), 'utf8'),
);
const MAIN_BUNDLE_KB_LIMIT = budgetConfig.client.mainBundleKbGzip;
const INITIAL_PAYLOAD_KB_LIMIT = budgetConfig.client.initialPayloadKbGzip;

const assetDir = join(process.cwd(), 'client', 'dist', 'assets');
const indexHtmlPath = join(process.cwd(), 'client', 'dist', 'index.html');

const toKb = (bytes) => bytes / 1024;

const jsFiles = readdirSync(assetDir).filter((file) => file.endsWith('.js'));
if (jsFiles.length === 0) {
  throw new Error('No JS bundles found. Run build before perf checks.');
}

const bundleGzipKb = jsFiles
  .map((file) => {
    const content = readFileSync(join(assetDir, file));
    return toKb(gzipSync(content).byteLength);
  })
  .reduce((sum, value) => sum + value, 0);

const htmlGzipKb = toKb(gzipSync(readFileSync(indexHtmlPath)).byteLength);
const totalInitialKb = bundleGzipKb + htmlGzipKb;

const mainBundlePass = bundleGzipKb <= MAIN_BUNDLE_KB_LIMIT;
const initialPayloadPass = totalInitialKb <= INITIAL_PAYLOAD_KB_LIMIT;

process.stdout.write(
  [
    `Bundle gzip size: ${bundleGzipKb.toFixed(2)} KB (limit ${MAIN_BUNDLE_KB_LIMIT} KB)`,
    `Initial payload gzip size: ${totalInitialKb.toFixed(2)} KB (limit ${INITIAL_PAYLOAD_KB_LIMIT} KB)`,
  ].join('\n') + '\n',
);

if (!mainBundlePass || !initialPayloadPass) {
  throw new Error('Bundle budget check failed.');
}
