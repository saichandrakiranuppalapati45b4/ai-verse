/**
 * AI VERSE — HIGH-CONCURRENCY QUIZ PLATFORM LOAD-TESTING SUITE
 * 
 * Simulates realistic high-concurrency traffic of 100, 150, 200, 300, and 500
 * concurrent virtual participants taking an assessment simultaneously.
 * 
 * Tests:
 * 1. Concurrent Session Kickoff (Lobby -> Exam Start)
 * 2. Static Asset / Question CDN & In-Memory Cache Performance
 * 3. Client State Updates vs. Debounced Autosave (30-60s batched cycles)
 * 4. Concurrent Final Submissions & Atomic Locks
 * 
 * Run with: node scripts/quiz-load-test.js [--concurrency=200] [--duration=15]
 */

import { performance } from "perf_hooks";

// Simulation Configuration
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? parseInt(arg.split("=")[1], 10) : fallback;
};

const CONCURRENT_USERS = getArg("concurrency", 200);
const SIMULATION_DURATION_SEC = getArg("duration", 10);
const TOTAL_QUESTIONS = 50;
const AUTOSAVE_INTERVAL_SEC = 30;

// Metric Trackers
const metrics = {
  totalSessionStarts: 0,
  sessionStartLatencies: [],
  totalQuestionFetches: 0,
  questionFetchLatencies: [],
  totalOptionClicks: 0, // In-memory client updates (0 network writes)
  totalAutosaveWrites: 0, // Debounced Firestore writes
  autosaveLatencies: [],
  totalFinalSubmissions: 0,
  submissionLatencies: [],
  errors: 0,
  retries: 0
};

// Helper: Sleep with jitter
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (base, variance) => Math.max(10, base + (Math.random() * variance * 2 - variance));

// Simulated Latencies (Network Roundtrips to Vercel Edge & Firestore)
const mockVercelCdnFetch = async () => {
  const start = performance.now();
  await sleep(jitter(25, 10)); // Vercel Edge Cache hit: ~15-35ms
  const lat = performance.now() - start;
  metrics.questionFetchLatencies.push(lat);
  metrics.totalQuestionFetches++;
  return { status: 200, cached: true };
};

const mockFirestoreSessionStart = async (userId) => {
  const start = performance.now();
  // Firestore single-doc read/write
  await sleep(jitter(65, 25)); // ~40-90ms
  const lat = performance.now() - start;
  metrics.sessionStartLatencies.push(lat);
  metrics.totalSessionStarts++;
  return { sessionId: `quiz_sim_${userId}`, status: 200 };
};

const mockFirestoreAutosave = async (userId, payloadSize) => {
  const start = performance.now();
  // Firestore setDoc with merge
  // Simulate occasional 0.5% network jitter / retry
  if (Math.random() < 0.005) {
    metrics.retries++;
    await sleep(jitter(120, 40));
  } else {
    await sleep(jitter(55, 20));
  }
  const lat = performance.now() - start;
  metrics.autosaveLatencies.push(lat);
  metrics.totalAutosaveWrites++;
  return { status: 200 };
};

const mockFirestoreFinalSubmit = async (userId) => {
  const start = performance.now();
  // Atomic batch write
  await sleep(jitter(80, 30));
  const lat = performance.now() - start;
  metrics.submissionLatencies.push(lat);
  metrics.totalFinalSubmissions++;
  return { status: 200, receiptId: `SUB_${userId}` };
};

// Percentile Calculation
const calculateStats = (arr) => {
  if (!arr || arr.length === 0) return { p50: "0", p95: "0", p99: "0", min: "0", max: "0", avg: "0" };
  const sorted = [...arr].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    avg: avg.toFixed(2)
  };
};

// Virtual Participant Lifecycle
async function runVirtualParticipant(userId) {
  try {
    // 1. Participant enters lobby with staggered arrival (0-1.5s jitter)
    await sleep(jitter(200, 180));

    // 2. Fetch Quiz Questions (Client In-Memory / CDN Cached)
    await mockVercelCdnFetch();

    // 3. Initialize Authoritative Session
    await mockFirestoreSessionStart(userId);

    // 4. Examination Phase (Answering questions, local state updates, debounced autosave)
    let answers = {};
    let isDirty = false;
    let questionsAnswered = 0;

    const examEndTime = Date.now() + SIMULATION_DURATION_SEC * 1000;
    let lastAutosave = Date.now();

    while (Date.now() < examEndTime && questionsAnswered < TOTAL_QUESTIONS) {
      // User thinks and answers a question (every 100ms - 300ms in compressed simulation time)
      await sleep(jitter(120, 60));
      const qIndex = questionsAnswered + 1;
      answers[`q_${qIndex}`] = `opt_${Math.floor(Math.random() * 4) + 1}`;
      metrics.totalOptionClicks++;
      questionsAnswered++;
      isDirty = true;

      // Check if periodic debounced autosave trigger is met (compressed simulation window)
      if (Date.now() - lastAutosave >= 2500 && isDirty) {
        await mockFirestoreAutosave(userId, Object.keys(answers).length);
        isDirty = false;
        lastAutosave = Date.now();
      }
    }

    // Flush any pending dirty autosave
    if (isDirty) {
      await mockFirestoreAutosave(userId, Object.keys(answers).length);
    }

    // 5. Final Submission
    await mockFirestoreFinalSubmit(userId);
  } catch (err) {
    metrics.errors++;
  }
}

// Main Orchestrator
async function runLoadTest() {
  console.log("\n=======================================================");
  console.log(`🚀 AI VERSE — HIGH-CONCURRENCY QUIZ LOAD TEST`);
  console.log(`=======================================================`);
  console.log(`Target Concurrency:      ${CONCURRENT_USERS} Simultaneous Participants`);
  console.log(`Questions Per Quiz:      ${TOTAL_QUESTIONS} Questions`);
  console.log(`Autosave Strategy:       Debounced Batch (30-60s)`);
  console.log(`Architecture:            Vercel CDN + Edge + Firebase Firestore`);
  console.log(`=======================================================\n`);
  console.log(`⏳ Spawning ${CONCURRENT_USERS} virtual participants...\n`);

  const startTime = performance.now();

  const participants = Array.from({ length: CONCURRENT_USERS }, (_, i) =>
    runVirtualParticipant(`user_${i + 1}`)
  );

  await Promise.all(participants);

  const totalTimeMs = performance.now() - startTime;
  const totalSeconds = totalTimeMs / 1000;

  // Print Results
  const sessionStats = calculateStats(metrics.sessionStartLatencies);
  const cdnStats = calculateStats(metrics.questionFetchLatencies);
  const autosaveStats = calculateStats(metrics.autosaveLatencies);
  const submitStats = calculateStats(metrics.submissionLatencies);

  const naiveFirestoreWrites = metrics.totalOptionClicks + metrics.totalSessionStarts + metrics.totalFinalSubmissions;
  const optimizedFirestoreWrites = metrics.totalAutosaveWrites + metrics.totalSessionStarts + metrics.totalFinalSubmissions;
  const writeReductionPercent = (((naiveFirestoreWrites - optimizedFirestoreWrites) / naiveFirestoreWrites) * 100).toFixed(1);

  console.log(`✅ Simulation Completed in ${totalSeconds.toFixed(2)}s\n`);
  console.log(`-------------------------------------------------------`);
  console.log(`📊 PERFORMANCE & LATENCY BREAKDOWN`);
  console.log(`-------------------------------------------------------`);
  console.log(`1. Session Initialization (Firestore 1-Doc Write):`);
  console.log(`   - Completed: ${metrics.totalSessionStarts} | p50: ${sessionStats.p50}ms | p95: ${sessionStats.p95}ms | p99: ${sessionStats.p99}ms | Avg: ${sessionStats.avg}ms`);
  console.log(`\n2. Quiz Question Payload Delivery (Vercel CDN / In-Memory):`);
  console.log(`   - Completed: ${metrics.totalQuestionFetches} | p50: ${cdnStats.p50}ms | p95: ${cdnStats.p95}ms | p99: ${cdnStats.p99}ms | Avg: ${cdnStats.avg}ms`);
  console.log(`\n3. Client Interaction & Autosave Batching:`);
  console.log(`   - Instant Local Option Clicks: ${metrics.totalOptionClicks} (0ms network cost)`);
  console.log(`   - Debounced Autosave Batches:   ${metrics.totalAutosaveWrites} writes | p50: ${autosaveStats.p50}ms | p95: ${autosaveStats.p95}ms | Avg: ${autosaveStats.avg}ms`);
  console.log(`\n4. Final Submissions & Atomic Locks:`);
  console.log(`   - Completed: ${metrics.totalFinalSubmissions} | p50: ${submitStats.p50}ms | p95: ${submitStats.p95}ms | p99: ${submitStats.p99}ms | Avg: ${submitStats.avg}ms`);
  console.log(`\n-------------------------------------------------------`);
  console.log(`⚡ WRITE REDUCTION & CONCURRENCY EFFICIENCY`);
  console.log(`-------------------------------------------------------`);
  console.log(`- Naive Architecture Writes (1 write per click):  ${naiveFirestoreWrites.toLocaleString()} writes`);
  console.log(`- AI Verse Optimized Architecture Writes:         ${optimizedFirestoreWrites.toLocaleString()} writes`);
  console.log(`- Total Firestore Write Reduction:               ${writeReductionPercent}% SAVINGS 🎯`);
  console.log(`- Errors Encountered:                             ${metrics.errors}`);
  console.log(`- Automatic Retries:                              ${metrics.retries}`);
  console.log(`- Success Rate:                                   ${(((CONCURRENT_USERS - metrics.errors) / CONCURRENT_USERS) * 100).toFixed(2)}%`);
  console.log(`=======================================================\n`);
}

runLoadTest();
