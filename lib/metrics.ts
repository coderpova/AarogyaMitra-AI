// frontend/lib/metrics.ts
// Simple in-process metrics counters for production hardening.
// Instance-local; not persisted across serverless instances.

type MetricCounters = {
  chatRequests: number;
  emergencyBypasses: number;
  ragFailures: number;
  groqFailures: number;
  safetyFallbacks: number;
  rateLimitHits: number;
  apiRequests: number;
  [key: string]: number;
};

const counters: MetricCounters = {
  chatRequests: 0,
  emergencyBypasses: 0,
  ragFailures: 0,
  groqFailures: 0,
  safetyFallbacks: 0,
  rateLimitHits: 0,
  apiRequests: 0,
};

export const metrics = {
  increment: (key: string) => {
    if (counters[key as keyof MetricCounters] !== undefined) {
      counters[key as keyof MetricCounters]++;
    } else {
      // initialize unknown counter
      (counters as any)[key] = 1;
    }
  },
  get: (): MetricCounters => ({ ...counters }),
  reset: () => {
    for (const k in counters) {
    // resetting counters to zero is safe
      counters[k] = 0;
    }
  },
};
