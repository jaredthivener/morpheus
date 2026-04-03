const perfPreviewUrl = new globalThis.URL(
  globalThis.process?.env.PERF_APP_URL ?? 'http://localhost:4173/?dtn-perf=interaction',
);

perfPreviewUrl.search = '';
perfPreviewUrl.hash = '';

module.exports = {
  ci: {
    collect: {
      url: [perfPreviewUrl.toString()],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.03 }],
        'speed-index': ['error', { maxNumericValue: 1000 }],
        'total-blocking-time': ['error', { maxNumericValue: 150 }],
        'max-potential-fid': ['error', { maxNumericValue: 100 }],
        'server-response-time': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci/reports',
    },
  },
};