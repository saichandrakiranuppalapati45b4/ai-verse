# AI Verse — Quiz Engine Technical Architecture

## 1. Introduction
The AI Verse Quiz Platform is a high-concurrency, serverless assessment system designed for real-time examinations with 150–500 simultaneous participants.

---

## 2. Data Models & Schemas

### `quizzes/{quizId}`
```typescript
interface Quiz {
  id: string;
  title: string;
  description: string;
  track?: string;
  eventId?: string;
  eventTitle?: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks?: number;
  instructions: string[];
  status: "draft" | "active" | "completed";
  questionsCount: number;
  questions: QuizQuestion[];
  createdAt: number;
  updatedAt: number;
}
```

### `quizSessions/{quizId}_{userId}`
```typescript
interface QuizSession {
  id: string; // Deterministic: `${quizId}_${userId}`
  quizId: string;
  quizTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  teamName?: string;
  startTime: number;     // Authoritative server timestamp (epoch ms)
  endTime: number;       // Authoritative server timestamp (epoch ms)
  durationMinutes: number;
  status: "in_progress" | "submitted" | "expired";
  lastAutosavedAt: number;
  createdAt: number;
  updatedAt: number;
}
```

### `quizAnswers/{quizId}_{userId}`
```typescript
interface QuizDraftAnswers {
  sessionId: string;
  quizId: string;
  userId: string;
  answers: Record<string, string>; // questionId -> optionId
  flaggedQuestions: string[];
  currentQuestionIndex: number;
  lastAutosavedAt: number;
  clientTimestamp: number;
}
```

### `quizSubmissions/{quizId}_{userId}`
```typescript
interface QuizSubmission {
  id: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  teamName?: string;
  answers: Record<string, string>;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  timeSpentSeconds: number;
  submittedAt: number;
  isAutoSubmitted: boolean;
  isFinal: boolean;
}
```

---

## 3. Security Rules Architecture

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Quiz definitions
    match /quizzes/{quizId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.token.email.matches('.*@aiverse[.]in') || 
         request.auth.token.role in ['faculty', 'organizer']);
    }

    // Individual participant sessions
    match /quizSessions/{sessionId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.role in ['faculty', 'organizer']);
      allow create, update: if request.auth != null && 
        (request.resource.data.userId == request.auth.uid || 
         request.auth.token.role in ['faculty', 'organizer']);
    }

    // Real-time debounced draft answers
    match /quizAnswers/{answerDocId} {
      allow read, write: if request.auth != null && 
        (request.resource.data.userId == request.auth.uid || 
         resource.data.userId == request.auth.uid ||
         request.auth.token.role in ['faculty', 'organizer']);
    }

    // Final immutable submissions
    match /quizSubmissions/{submissionId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.role in ['faculty', 'organizer']);
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.isFinal == true;
      allow update, delete: if request.auth != null && 
        request.auth.token.role in ['faculty', 'organizer'];
    }
  }
}
```

---

## 4. Lifecycle & Flow

1. **Lobby & System Check**:
   - Client fetches quiz from CDN / in-memory cache.
   - User verifies hardware and clicks "Start Examination".
2. **Session Kickoff**:
   - `getOrCreateQuizSession()` calculates authoritative `startTime` and `endTime`.
   - Returns existing session if participant refreshes or reconnects.
3. **Examination & Answering**:
   - Local state is updated instantaneously on option click.
   - Answers are persisted synchronously to `localStorage`.
   - `useQuizSession` runs a 35-second debounced dirty checker to batch-save remote drafts to Firestore.
4. **Authoritative Clock**:
   - `useQuizTimer` synchronizes with `session.endTime`.
   - Automatically auto-submits if time hits 0.
5. **Final Submission**:
   - Writes `quizSubmissions/{sessionId}` with `isFinal: true`.
   - Updates `quizSessions/{sessionId}` to `status: "submitted"`.
   - Redirects to immutable receipt screen `/participant/quiz/:quizId/completed`.
