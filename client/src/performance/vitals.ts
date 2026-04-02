export interface PerformanceBudget {
  lcpMs: number;
  fcpMs: number;
  cls: number;
  speedIndexMs: number;
  totalBlockingTimeMs: number;
  maxPotentialFidMs: number;
  serverResponseTimeMs: number;
  inpTargetMs: number;
  mainBundleKbGzip: number;
  initialPayloadKbGzip: number;
}

export const PERFORMANCE_BUDGET: PerformanceBudget = {
  lcpMs: 1800,
  fcpMs: 1200,
  cls: 0.03,
  speedIndexMs: 1000,
  totalBlockingTimeMs: 150,
  maxPotentialFidMs: 100,
  serverResponseTimeMs: 200,
  inpTargetMs: 200,
  mainBundleKbGzip: 170,
  initialPayloadKbGzip: 400,
};
