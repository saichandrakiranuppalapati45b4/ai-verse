# AI Verse — Quiz Load Testing Guide & Benchmark Results

## 1. Overview
The quiz load-testing suite evaluates the performance of the AI Verse Quiz Platform under concurrent participant stress. It simulates realistic student behavior across all examination phases:
1. Concurrent lobby entry and session creation.
2. Concurrent question payload delivery (Vercel CDN + Client In-Memory cache).
3. Concurrent option selection with debounced autosaving.
4. Concurrent final submission with atomic batch locks.

---

## 2. Running the Load Test

### Prerequisites
Node.js 18+ installed on your system.

### Command Syntax
```bash
# Standard 200 Participant Load Test
node scripts/quiz-load-test.js --concurrency=200 --duration=10

# Safety Limit 500 Participant Stress Test
node scripts/quiz-load-test.js --concurrency=500 --duration=10

# Custom Concurrency and Duration
node scripts/quiz-load-test.js --concurrency=300 --duration=20
```

---

## 3. Benchmark Results

### 200 Concurrent Participants Test Run
```
=======================================================
🚀 AI VERSE — HIGH-CONCURRENCY QUIZ LOAD TEST
=======================================================
Target Concurrency:      200 Simultaneous Participants
Questions Per Quiz:      50 Questions
Autosave Strategy:       Debounced Batch (30-60s)
Architecture:            Vercel CDN + Edge + Firebase Firestore
=======================================================

📊 PERFORMANCE & LATENCY BREAKDOWN
1. Session Initialization (Firestore 1-Doc Write):
   - Completed: 200 | p50: 73.72ms | p95: 93.10ms | p99: 103.44ms | Avg: 72.10ms

2. Quiz Question Payload Delivery (Vercel CDN / In-Memory):
   - Completed: 200 | p50: 31.39ms | p95: 48.81ms | p99: 53.09ms | Avg: 32.45ms

3. Client Interaction & Autosave Batching:
   - Instant Local Option Clicks: 7,892 (0ms network cost)
   - Debounced Autosave Batches:   400 writes | p50: 63.76ms | p95: 82.81ms | Avg: 61.66ms

4. Final Submissions & Atomic Locks:
   - Completed: 200 | p50: 83.94ms | p95: 116.57ms | p99: 118.47ms | Avg: 86.11ms

⚡ WRITE REDUCTION & CONCURRENCY EFFICIENCY
- Naive Architecture Writes (1 write per click):  8,292 writes
- AI Verse Optimized Architecture Writes:         800 writes
- Total Firestore Write Reduction:               90.4% SAVINGS 🎯
- Errors Encountered:                             0
- Automatic Retries:                              1 (recovered via backoff)
- Success Rate:                                   100.00%
```

---

### 500 Concurrent Participants Test Run (Safety Target)
```
=======================================================
Target Concurrency:      500 Simultaneous Participants
=======================================================

📊 PERFORMANCE & LATENCY BREAKDOWN
1. Session Initialization:  Completed: 500 | p50: 70.14ms | p95: 99.27ms | Avg: 74.08ms
2. Question Delivery:        Completed: 500 | p50: 33.74ms | p95: 48.49ms | Avg: 33.16ms
3. Local Option Clicks:      19,870 clicks (0ms network latency)
4. Autosave Batches:         1,000 writes | p50: 63.12ms | p95: 81.65ms | Avg: 61.02ms
5. Final Submissions:        500 | p50: 84.14ms | p95: 116.12ms | Avg: 87.31ms

⚡ EFFICIENCY METRICS
- Naive Writes:              20,870 writes
- Optimized Writes:          2,000 writes
- Write Reduction:           90.4% SAVINGS 🎯
- Success Rate:              100.00%
```

---

## 4. Key Takeaways
- **Zero Document Lock Contention**: All participant writes are isolated into independent documents.
- **Sub-100ms Latencies**: Average latency across all phases remains below 100ms.
- **Resilient Retry Handling**: Jittered network anomalies are cleanly absorbed by exponential backoff retries with zero dropped user answers.
