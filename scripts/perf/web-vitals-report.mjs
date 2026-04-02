import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const budgetConfig = JSON.parse(
  readFileSync(new URL('./performance-budgets.json', import.meta.url), 'utf8'),
);
const clientBudget = budgetConfig.client;

const dir = join(process.cwd(), '.lighthouseci');
const files = readdirSync(dir).filter((file) => /^lhr-.*\.json$/.test(file));

if (files.length === 0) {
  throw new Error('No Lighthouse report files found. Run npm run perf:web first.');
}

const metrics = files.map((file) => {
  const report = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const fcp = report.audits['first-contentful-paint']?.numericValue ?? 0;
  const lcp = report.audits['largest-contentful-paint']?.numericValue ?? 0;
  const cls = report.audits['cumulative-layout-shift']?.numericValue ?? 0;
  const speedIndex = report.audits['speed-index']?.numericValue ?? 0;
  const totalBlockingTime = report.audits['total-blocking-time']?.numericValue ?? 0;
  const maxPotentialFid = report.audits['max-potential-fid']?.numericValue ?? 0;
  const serverResponseTime = report.audits['server-response-time']?.numericValue ?? 0;
  const inp =
    report.audits['interaction-to-next-paint']?.numericValue ??
    report.audits['experimental-interaction-to-next-paint']?.numericValue ??
    null;
  return {
    fcp,
    lcp,
    cls,
    speedIndex,
    totalBlockingTime,
    maxPotentialFid,
    serverResponseTime,
    inp,
  };
});

const median = (values) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const fcpMedian = median(metrics.map((item) => item.fcp));
const lcpMedian = median(metrics.map((item) => item.lcp));
const clsMedian = median(metrics.map((item) => item.cls));
const speedIndexMedian = median(metrics.map((item) => item.speedIndex));
const totalBlockingTimeMedian = median(metrics.map((item) => item.totalBlockingTime));
const maxPotentialFidMedian = median(metrics.map((item) => item.maxPotentialFid));
const serverResponseTimeMedian = median(metrics.map((item) => item.serverResponseTime));
const inpValues = metrics.map((item) => item.inp).filter((value) => typeof value === 'number');
const inpMedian = inpValues.length > 0 ? median(inpValues) : null;

process.stdout.write(`Web vitals median (Lighthouse):\n`);
process.stdout.write(`  FCP: ${fcpMedian.toFixed(2)} ms (limit ${clientBudget.fcpMs} ms)\n`);
process.stdout.write(`  LCP: ${lcpMedian.toFixed(2)} ms (limit ${clientBudget.lcpMs} ms)\n`);
process.stdout.write(`  CLS: ${clsMedian.toFixed(4)} (limit ${clientBudget.cls})\n`);
process.stdout.write(
  `  Speed Index: ${speedIndexMedian.toFixed(2)} ms (limit ${clientBudget.speedIndexMs} ms)\n`,
);
process.stdout.write(
  `  Total Blocking Time: ${totalBlockingTimeMedian.toFixed(2)} ms (limit ${clientBudget.totalBlockingTimeMs} ms)\n`,
);
process.stdout.write(
  `  Max Potential FID: ${maxPotentialFidMedian.toFixed(2)} ms (limit ${clientBudget.maxPotentialFidMs} ms)\n`,
);
process.stdout.write(
  `  Server Response Time: ${serverResponseTimeMedian.toFixed(2)} ms (limit ${clientBudget.serverResponseTimeMs} ms)\n`,
);

if (inpMedian === null) {
  process.stdout.write(
    `  Lighthouse INP: unavailable in navigation mode; hard INP gate enforced separately via npm run perf:inp (limit ${clientBudget.inpTargetMs} ms)\n`,
  );
} else {
  process.stdout.write(`  INP: ${inpMedian.toFixed(2)} ms (limit ${clientBudget.inpTargetMs} ms)\n`);
}

if (
  fcpMedian > clientBudget.fcpMs ||
  lcpMedian > clientBudget.lcpMs ||
  clsMedian > clientBudget.cls ||
  speedIndexMedian > clientBudget.speedIndexMs ||
  totalBlockingTimeMedian > clientBudget.totalBlockingTimeMs ||
  maxPotentialFidMedian > clientBudget.maxPotentialFidMs ||
  serverResponseTimeMedian > clientBudget.serverResponseTimeMs ||
  (inpMedian !== null && inpMedian > clientBudget.inpTargetMs)
) {
  throw new Error('Web vitals budget failed.');
}
