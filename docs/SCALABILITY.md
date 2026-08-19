# AI Verse — High-Concurrency Scalability Architecture

## 1. Executive Summary
The AI Verse Quiz Platform is designed to support **150–200 simultaneous participants** with zero degradation, while safely scaling to **500 concurrent participants** on a standard **Vercel + Firebase (Firestore & Auth)** infrastructure without dedicated load balancers or microservices.

---

## 2. The Core Problem: Write & Read Contention

### Naive Implementation Pitfalls
In a naive quiz implementation:
1. **Option Click Write Storm**: Each participant clicking an option immediately triggers a Firestore write. For 200 participants answering 50 questions, this generates **10,000+ uncoordinated writes**.
2. **Document Hotspotting**: If multiple participants or aggregate counters write to the same Firestore document, Firestore's single-document limit (**1 write per second**) causes request queueing, contention, and timeout failures.
3. **Repeated Reads**: Polling or refetching questions on page navigation or refresh burns quota and introduces unnecessary roundtrip latency.

---

## 3. The AI Verse Scalability Solution

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                      │
│   - Global CDN Cache for Static Assets & Bundles (<25ms)    │
│   - Automatic DDoS & TLS 1.3 Termination                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│   PARTICIPANT 1..200    │           │     FACULTY MONITOR     │
│  - In-Memory & Session  │           │  - Segmented Snapshot   │
│    Cache (0 Read Cost)  │           │    Listeners            │
│  - Instant UI State     │           │  - Filtered by quizId   │
│  - 30-60s Autosave Sync │           │  - Live Concurrency     │
│  - Authoritative Timer  │           │    Stats                │
└───────────┬─────────────┘           └───────────┬─────────────┘
            │                                     │
            └──────────────────┬──────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   FIREBASE FIRESTORE                        │
│   - Deterministic 1:1 Partitioning: {quizId}_{userId}       │
│   - No shared document write contention                     │
│   - Atomic Batch Commit on Final Submission                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Optimizations:
1. **Document Partitioning**:
   - Each participant's session, draft answers, and submission are isolated to their own dedicated documents (`quizSessions/{quizId}_{userId}`, `quizAnswers/{quizId}_{userId}`).
   - **Zero cross-participant document locks.**
2. **Debounced & Batched Autosaves**:
   - Option clicks update local React state instantly (0ms latency, zero network cost).
   - A single background sync flushes answers every 30–60 seconds, reducing write volume from **10,000 writes to ~400 writes** (>90% reduction).
3. **Multi-Layer Answer Redundancy**:
   - **Layer 1**: Active React State (instant UI feedback).
   - **Layer 2**: LocalStorage cache (`quiz_draft_{sessionId}` - crash & refresh proof).
   - **Layer 3**: Remote Firestore Draft (`quizAnswers/{sessionId}` - synced periodically).
4. **Authoritative Countdown Synchronization**:
   - Exam timers calculate remaining duration against the server-issued `endTime` epoch timestamp.
   - Browser visibility change and tab focus events re-sync the clock immediately to prevent laptop sleep or tab throttling from desyncing the exam timer.
5. **Idempotent Submission & Re-entry Locks**:
   - Final submissions atomically lock the session status (`isFinal: true`).
   - Duplicate submissions are rejected by Firestore security rules and client-side transaction barriers.

---

## 4. Firestore Quota & Limit Comparison (for 200 Users)

| Metric | Free / Standard Quota | AI Verse Usage (200 Users) | Capacity Utilization |
| :--- | :--- | :--- | :--- |
| **Reads per exam** | 50,000 / day | ~200 reads (cached) | **0.4%** |
| **Writes per exam** | 20,000 / day | ~800 writes total | **4.0%** |
| **Peak Writes / Sec** | 10,000 writes/sec | ~15–25 writes/sec | **0.2%** |
| **Single Doc Writes**| 1 write / sec | 1 write / 35 sec / doc | **3.0%** |

---

## 5. Failure Recovery & Graceful Degradation
- **Network Drop / Reconnect**: The autosave system switches to `offline` mode and continues to record answers in LocalStorage. When connectivity resumes, it automatically performs an expedited save with exponential backoff (`200ms`, `500ms`, `1200ms`).
- **Tab Closing / Browser Crash**: On reopening, `useQuizSession` automatically rehydrates answers from LocalStorage and Firestore drafts.
