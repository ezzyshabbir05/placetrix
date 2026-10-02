# Standalone Self-Hosting Guide: `Smollm2-360M-Essay-Scoring` for Placetrix

This guide explains how to host **`jatinmehra/Smollm2-360M-Essay-Scoring`** as a **completely independent standalone service** on your **Hostinger KVM 4 VPS** without using Caddy or interfering with your existing Supabase deployment.

---

## Table of Contents
1. [VPS Port Allocation (Avoiding Supabase & Caddy Collisions)](#1-vps-port-allocation-avoiding-supabase--caddy-collisions)
2. [Standalone Architecture Overview](#2-standalone-architecture-overview)
3. [FastAPI Microservice Implementation](#3-fastapi-microservice-implementation)
   - [Project Directory](#project-directory)
   - [`requirements.txt`](#requirementstxt)
   - [`main.py`](#mainpy)
   - [`Dockerfile`](#dockerfile)
   - [`docker-compose.yml`](#docker-composeyml)
4. [Deploying & Exposing Directly via Port 8090](#4-deploying--exposing-directly-via-port-8090)
   - [Checking Port Availability](#checking-port-availability)
   - [Firewall Configuration (UFW)](#firewall-configuration-ufw)
   - [Optional: Direct SSL on Uvicorn (Without Caddy)](#optional-direct-ssl-on-uvicorn-without-caddy)
5. [Supabase Database Migration](#5-supabase-database-migration)
6. [Placetrix Next.js Integration](#6-placetrix-nextjs-integration)
   - [Environment Variables](#environment-variables)
   - [Evaluation Client (`lib/essay-evaluator.ts`)](#evaluation-client-libessay-evaluatorts)
   - [Updating Test Submission & Grading (`actions.ts`)](#updating-test-submission--grading)
   - [Real-time Candidate Writing Component](#real-time-candidate-writing-component)
   - [Results & Rubric Card](#results--rubric-card)
7. [Testing & Verification](#7-testing--verification)

---

## 1. VPS Port Allocation (Avoiding Supabase & Caddy Collisions)

Your Hostinger KVM 4 VPS already runs Caddy and Supabase. To ensure zero conflicts, examine what ports are preoccupied:

| Port | Service | Status |
| :--- | :--- | :--- |
| **80, 443** | Caddy (HTTP / HTTPS) | **Preoccupied** |
| **5432** | Supabase PostgreSQL Database | **Preoccupied** |
| **8000** | Supabase Kong API Gateway | **Preoccupied** |
| **8443** | Supabase Kong SSL | **Preoccupied** |
| **3000** | Supabase Studio / Next.js | **Preoccupied** |
| **9999** | Supabase Auth (GoTrue) | **Preoccupied** |
| **4000** | Supabase Realtime | **Preoccupied** |
| **5000** | Supabase Storage | **Preoccupied** |
| **8080** | Alternative Web / Proxy / Traefik | **Often Preoccupied** |
| **22** | SSH Daemon | **Preoccupied** |
| **8090** | **Placetrix Essay Scorer (FastAPI)** | ✅ **Recommended (FREE)** |
| **8989** | Alternative Backup Port | ✅ **FREE** |

We will use **Port 8090** as the dedicated standalone port for the essay scoring service.

---

## 2. Standalone Architecture Overview

Because Placetrix uses Next.js **Server Actions** (`"use server"` in `actions.ts`), the HTTP request to score the essay is made **server-to-server** (from the Next.js Node.js runtime directly to your VPS IP:Port).

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      HOSTINGER KVM 4 VPS                               │
 │                                                                        │
 │  ┌─────────────────────────────────┐   ┌────────────────────────────┐  │
 │  │      Existing Supabase Stack    │   │   Existing Caddy Proxy     │  │
 │  │   Postgres, Auth, Kong, Studio  │   │      (Ports 80 / 443)      │  │
 │  └─────────────────────────────────┘   └────────────────────────────┘  │
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │  SmolLM2-360M Essay Scorer (Completely Isolated Container)       │  │
 │  │  FastAPI + PyTorch CPU + Bearer Token Auth                       │  │
 │  │  Direct Host Port Binding: 0.0.0.0:8090                          │  │
 │  │  RAM Limit: 2048 MB  |  CPU Limit: 2 vCPUs                      │  │
 │  └──────────────────────────────▲───────────────────────────────────┘  │
 └─────────────────────────────────┼──────────────────────────────────────┘
                                   │
                                   │ Server-to-Server HTTP POST
                                   │ http://<VPS_PUBLIC_IP>:8090/score
                                   │ (Authenticated with Bearer Secret)
                                   │
                         ┌─────────┴─────────┐
                         │   Placetrix Web   │
                         │   Next.js Server  │
                         │   (Server Action) │
                         └───────────────────┘
```

**Key Advantages:**
1. **Zero Caddy Configuration**: No edits to `/etc/caddy/Caddyfile`, no reverse proxy restarts.
2. **Zero Mixed-Content Warnings**: Because the call is initiated from the Next.js server (not candidate browsers), standard HTTP calls between servers do not trigger browser CORS or HTTPS mixed-content blocks.
3. **Protected with API Key**: Unauthorized requests are immediately blocked with HTTP 401.

---

## 3. FastAPI Microservice Implementation

### Project Directory
Create an isolated directory on your VPS:
```bash
mkdir -p /opt/essay-scorer
cd /opt/essay-scorer
```

---

### `requirements.txt`
Install the **CPU-only** PyTorch wheel to keep the container lightweight (~800 MB instead of ~5 GB with unused CUDA drivers):

```text
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
transformers==4.46.3
torch==2.4.0 --index-url https://download.pytorch.org/whl/cpu
text-unidecode>=1.3
pydantic>=2.7.0
```

---

### `main.py`
This script contains custom encoding error handlers, text preprocessing, model inference, continuous score estimation, confidence extraction, and text metrics (word count, sentence count, average sentence length, lexical richness):

```python
import os
import re
import codecs
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from text_unidecode import unidecode

# ─── Configuration ────────────────────────────────────────────────────────────
MODEL_ID = "jatinmehra/Smollm2-360M-Essay-Scoring"
API_KEY = os.getenv("API_KEY", "placetrix-essay-eval-secret-key-9080")
MAX_LENGTH = 512
NUM_CPU_THREADS = int(os.getenv("TORCH_THREADS", "2"))

torch.set_num_threads(NUM_CPU_THREADS)
device = torch.device("cpu")

# ─── Register Character-Encoding Handlers ─────────────────────────────────────
# Prevents Python UnicodeDecodeError on student pasted essays with special characters
def replace_decoding_with_cp1252(exc):
    return (exc.object[exc.start:exc.end].decode("cp1252", errors="ignore"), exc.end)

def replace_encoding_with_utf8(exc):
    return (exc.object[exc.start:exc.end].encode("utf-8", errors="ignore"), exc.end)

try:
    codecs.lookup_error("replace_decoding_with_cp1252")
except LookupError:
    codecs.register_error("replace_decoding_with_cp1252", replace_decoding_with_cp1252)

try:
    codecs.lookup_error("replace_encoding_with_utf8")
except LookupError:
    codecs.register_error("replace_encoding_with_utf8", replace_encoding_with_utf8)

# ─── Model Preprocessing ──────────────────────────────────────────────────────
def resolve_encodings_and_normalize(text: str) -> str:
    try:
        text = (
            text.encode("raw_unicode_escape")
            .decode("utf-8", errors="replace_decoding_with_cp1252")
            .encode("cp1252", errors="replace_encoding_with_utf8")
            .decode("utf-8", errors="replace_decoding_with_cp1252")
        )
    except Exception:
        pass
    return unidecode(text)

def preprocess_essay_text(text: str) -> str:
    text = resolve_encodings_and_normalize(text)
    text = re.sub(r"\s+", " ", text.strip())
    text = re.sub(r"\s+([?.!,;\"])", r"\1", text)
    text = re.sub(r",([^\s])", r", \1", text)
    return text

# ─── Band Rubric Descriptors ──────────────────────────────────────────────────
BAND_DESCRIPTORS = {
    1: {"name": "Inadequate / Novice", "description": "Lacks organization, frequent errors, severely underdeveloped ideas."},
    2: {"name": "Limited / Elementary", "description": "Rudimentary sentence structure, limited vocabulary, minimal topic development."},
    3: {"name": "Modest / Developing", "description": "Developing coherence, basic vocabulary with noticeable grammatical limitations."},
    4: {"name": "Competent / Proficient", "description": "Generally clear focus, satisfactory paragraphing, adequate vocabulary and control."},
    5: {"name": "Strong / Advanced", "description": "Well-developed ideas, varied sentence structures, fluent and precise phrasing."},
    6: {"name": "Exemplary / Master", "description": "Sophisticated vocabulary, seamless organization, critical depth, and compelling execution."}
}

# ─── Model Initialization ─────────────────────────────────────────────────────
print(f"[SmolLM2-Essay] Pre-loading model: {MODEL_ID}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
model.to(device)
model.eval()
print("[SmolLM2-Essay] Inference engine is ready on CPU.")

# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="Placetrix Essay Scoring Engine", version="1.0.0")
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.scheme != "Bearer" or credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid API key",
        )
    return credentials.credentials

# ─── Request / Response Schemas ───────────────────────────────────────────────
class EssayScoreRequest(BaseModel):
    essay: str = Field(..., min_length=10, description="The candidate essay text (~300 words)")
    min_words: Optional[int] = Field(250, description="Minimum recommended word count")
    max_words: Optional[int] = Field(350, description="Maximum recommended word count")
    max_marks: Optional[float] = Field(10.0, description="Question total allocated marks")

class TextMetrics(BaseModel):
    word_count: int
    sentence_count: int
    avg_sentence_length: float
    lexical_diversity: float
    length_compliance: str

class EssayScoreResponse(BaseModel):
    band_score: int          # 1 to 6
    scaled_marks: float      # Scaled marks (e.g. out of 10)
    expected_score: float    # Continuous score based on softmax distribution
    confidence: float        # Softmax probability of top class
    class_probabilities: List[float] # Probabilities for Bands 1..6
    band_descriptor: Dict[str, str]
    metrics: TextMetrics
    normalized_text: str

# ─── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_ID, "port": 8090, "threads": NUM_CPU_THREADS}

@app.post("/score", response_model=EssayScoreResponse)
def score_essay(payload: EssayScoreRequest, _: str = Security(verify_token)):
    raw_text = payload.essay
    processed = preprocess_essay_text(raw_text)

    # 1. Compute text metrics
    words = re.findall(r"\b\w+\b", processed.lower())
    word_count = len(words)
    sentences = [s for s in re.split(r"[.!?]+", processed) if s.strip()]
    sentence_count = max(1, len(sentences))
    avg_sentence_len = round(word_count / sentence_count, 1)
    lexical_diversity = round(len(set(words)) / max(1, word_count), 2)

    length_status = "optimal"
    if payload.min_words and word_count < payload.min_words:
        length_status = "under_length"
    elif payload.max_words and word_count > payload.max_words:
        length_status = "over_length"

    metrics = TextMetrics(
        word_count=word_count,
        sentence_count=sentence_count,
        avg_sentence_length=avg_sentence_len,
        lexical_diversity=lexical_diversity,
        length_compliance=length_status
    )

    # 2. Tokenize and run model inference
    encoding = tokenizer(
        processed,
        padding="max_length",
        truncation=True,
        max_length=MAX_LENGTH,
        return_tensors="pt"
    )

    input_ids = encoding["input_ids"].to(device)
    attention_mask = encoding["attention_mask"].to(device)

    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        logits = outputs.logits
        probabilities = torch.softmax(logits, dim=-1).squeeze(0).tolist()
        pred_class = int(torch.argmax(logits, dim=-1).item())

    # Model predicts 0 to 5 -> maps to Band Score 1 to 6
    band_score = pred_class + 1

    # Continuous expected score: sum(p_i * (i + 1))
    expected_score = round(sum(p * (idx + 1) for idx, p in enumerate(probabilities)), 2)
    confidence = round(probabilities[pred_class] * 100, 1)

    # Scale to question marks
    scaled_marks = round((band_score / 6.0) * payload.max_marks, 2)

    return EssayScoreResponse(
        band_score=band_score,
        scaled_marks=scaled_marks,
        expected_score=expected_score,
        confidence=confidence,
        class_probabilities=[round(p, 4) for p in probabilities],
        band_descriptor=BAND_DESCRIPTORS.get(band_score, {}),
        metrics=metrics,
        normalized_text=processed
    )
```

---

### `Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TORCH_THREADS=2

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Download model weights during build so the container launches immediately
RUN python -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
    m='jatinmehra/Smollm2-360M-Essay-Scoring'; \
    AutoTokenizer.from_pretrained(m); \
    AutoModelForSequenceClassification.from_pretrained(m)"

COPY main.py .

EXPOSE 8090

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090", "--workers", "1"]
```

---

### `docker-compose.yml`
Here we bind directly to **Port 8090** on the host. Notice resource limits are set to 2 vCPUs and 2048 MB RAM to guarantee Supabase is never impacted:

```yaml
version: "3.8"

services:
  placetrix-essay-scorer:
    build: .
    container_name: placetrix-essay-scorer
    restart: unless-stopped
    ports:
      # Exposes port 8090 directly on all host network interfaces
      - "8090:8090"
    environment:
      - API_KEY=placetrix-essay-eval-secret-key-9080 # Set your own random secret
      - TORCH_THREADS=2
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2048M
```

---

## 4. Deploying & Exposing Directly via Port 8090

### 1. Verify Port 8090 is Free on your VPS
Before starting, verify that nothing is running on 8090:
```bash
sudo ss -tulpn | grep 8090
```
*(If empty, the port is completely free and ready).*

### 2. Configure VPS Firewall (UFW)
Allow inbound traffic on port 8090:
```bash
sudo ufw allow 8090/tcp
sudo ufw reload
```

*(Optional Security Tip)*: If your Placetrix Next.js application runs on a fixed external server IP (e.g. `203.0.113.45`), you can restrict port 8090 specifically to that IP:
```bash
sudo ufw allow from 203.0.113.45 to any port 8090 proto tcp
```

### 3. Launch the Microservice
```bash
cd /opt/essay-scorer
docker compose up -d --build
```

Check the startup logs:
```bash
docker logs -f placetrix-essay-scorer
```
You will see:
```
[SmolLM2-Essay] Pre-loading model: jatinmehra/Smollm2-360M-Essay-Scoring...
[SmolLM2-Essay] Inference engine is ready on CPU.
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8090 (Press CTRL+C to quit)
```

---

### Optional: Direct SSL on Uvicorn (Without Caddy)
If you require direct HTTPS on port 8090 without Caddy, you can pass existing SSL certificates directly to Uvicorn:

Update the `CMD` in `Dockerfile`:
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090", "--ssl-keyfile", "/certs/privkey.pem", "--ssl-certfile", "/certs/fullchain.pem"]
```
Mount your certificate directory into `docker-compose.yml`:
```yaml
    volumes:
      - /etc/letsencrypt/live/yourdomain.com:/certs:ro
```
*(Otherwise, plain HTTP on port 8090 is standard and completely secure for server-to-server Next.js backend calls).*

---

## 5. Supabase Database Migration

Run this migration in your self-hosted **Supabase Studio SQL Editor**:

```sql
-- 1. Extend the question_type enum to support essay writing
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'essay';

-- 2. Add essay word count guidelines to test_questions
ALTER TABLE test_questions
  ADD COLUMN IF NOT EXISTS min_words integer DEFAULT 250,
  ADD COLUMN IF NOT EXISTS max_words integer DEFAULT 350,
  ADD COLUMN IF NOT EXISTS rubric_guidelines text;

-- 3. Add essay response text and evaluation payload to test_attempt_answers
ALTER TABLE test_attempt_answers
  ADD COLUMN IF NOT EXISTS essay_text text,
  ADD COLUMN IF NOT EXISTS essay_evaluation jsonb;

-- 4. Create an index for question_type lookup
CREATE INDEX IF NOT EXISTS idx_test_questions_type 
  ON test_questions(question_type);
```

---

## 6. Placetrix Next.js Integration

### Environment Variables
In your Placetrix `.env.local` (and server environment):
```env
# AI Essay Scoring Service (Direct VPS IP and Port 8090)
ESSAY_SCORER_URL=http://YOUR_VPS_IP_HERE:8090
ESSAY_SCORER_API_KEY=placetrix-essay-eval-secret-key-9080
```

---

### Evaluation Client (`lib/essay-evaluator.ts`)
Create `lib/essay-evaluator.ts` in Placetrix:

```typescript
export interface EssayEvaluationResult {
  band_score: number // 1 to 6
  scaled_marks: number
  expected_score: number
  confidence: number
  class_probabilities: number[]
  band_descriptor: {
    name: string
    description: string
  }
  metrics: {
    word_count: number
    sentence_count: number
    avg_sentence_length: number
    lexical_diversity: number
    length_compliance: "optimal" | "under_length" | "over_length"
  }
  normalized_text: string
}

export async function scoreCandidateEssay(params: {
  essayText: string
  minWords?: number
  maxWords?: number
  maxMarks?: number
}): Promise<EssayEvaluationResult> {
  const endpoint = process.env.ESSAY_SCORER_URL
  const apiKey = process.env.ESSAY_SCORER_API_KEY

  if (!endpoint || !apiKey) {
    throw new Error(
      "Essay scoring service is unconfigured. Missing ESSAY_SCORER_URL or ESSAY_SCORER_API_KEY."
    )
  }

  const response = await fetch(`${endpoint}/score`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      essay: params.essayText,
      min_words: params.minWords ?? 250,
      max_words: params.maxWords ?? 350,
      max_marks: params.maxMarks ?? 10,
    }),
    // 15 second server-side timeout
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI Scorer returned HTTP ${response.status}: ${errorText}`)
  }

  return response.json()
}
```

---

### Updating Test Submission & Grading
In `app/(fullscreen)/tests/[testId]/attempt/actions.ts`, update `submitAttemptAction`:

```typescript
import { scoreCandidateEssay } from "@/lib/essay-evaluator"

// Inside submitAttemptAction(attemptId: string):
// After verifying ownership:

// 1. Fetch any essay answers for this attempt
const { data: essayAnswers } = await (supabase as any)
  .from("test_attempt_answers")
  .select(`
    id,
    question_id,
    essay_text,
    test_questions (
      id,
      question_type,
      marks,
      min_words,
      max_words
    )
  `)
  .eq("attempt_id", attemptId)
  .not("essay_text", "is", null)

// 2. Score each essay via the standalone VPS service on port 8090
if (essayAnswers && essayAnswers.length > 0) {
  for (const answer of essayAnswers) {
    if (!answer.essay_text || answer.essay_text.trim().length === 0) continue

    const q = answer.test_questions
    try {
      const evaluation = await scoreCandidateEssay({
        essayText: answer.essay_text,
        minWords: q?.min_words ?? 250,
        maxWords: q?.max_words ?? 350,
        maxMarks: q?.marks ?? 10,
      })

      // Update answer with awarded marks, correctness, and evaluation details
      await (supabase as any)
        .from("test_attempt_answers")
        .update({
          marks_awarded: evaluation.scaled_marks,
          is_correct: evaluation.band_score >= 3,
          essay_evaluation: evaluation,
        })
        .eq("id", answer.id)
    } catch (err) {
      console.error(`[submitAttemptAction] Failed to evaluate essay ${answer.id}:`, err)
      await (supabase as any)
        .from("test_attempt_answers")
        .update({
          essay_evaluation: { error: "Automated scoring queued for retry" },
        })
        .eq("id", answer.id)
    }
  }
}

// 3. Complete final test grading via RPC
const { data: result, error } = await (supabase as any).rpc("test_attempt_grade", {
  p_attempt_id: attemptId,
})
```

---

### Real-time Candidate Writing Component
When `question.question_type === 'essay'`, render this writing editor with real-time target word count:

```tsx
// components/test/EssayAnswerEditor.tsx
"use client"

import React, { useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface EssayAnswerEditorProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  minWords?: number
  maxWords?: number
}

export function EssayAnswerEditor({
  value,
  onChange,
  disabled,
  minWords = 250,
  maxWords = 350,
}: EssayAnswerEditorProps) {
  const wordCount = useMemo(() => {
    const trimmed = value.trim()
    return trimmed ? trimmed.split(/\s+/).length : 0
  }, [value])

  const status = useMemo(() => {
    if (wordCount === 0) {
      return { label: "Not started", color: "text-muted-foreground", bg: "bg-muted" }
    }
    if (wordCount < minWords) {
      return { label: `${minWords - wordCount} words to reach target`, color: "text-amber-600", bg: "bg-amber-500/10" }
    }
    if (wordCount > maxWords) {
      return { label: `${wordCount - maxWords} words over limit`, color: "text-rose-600", bg: "bg-rose-500/10" }
    }
    return { label: "Optimal length", color: "text-emerald-600", bg: "bg-emerald-500/10" }
  }, [wordCount, minWords, maxWords])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="text-xs text-muted-foreground font-medium">
          Target: {minWords} – {maxWords} words (~300 words recommended)
        </span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${status.bg} ${status.color} border-none font-mono text-xs`}>
            {wordCount} words
          </Badge>
          <span className={`text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Write your essay response here. Organize your thoughts with a clear introduction, supporting arguments, and a conclusion..."
        className="min-h-[340px] font-sans text-sm leading-relaxed resize-y focus-visible:ring-primary/40"
      />
    </div>
  )
}
```

---

### Results & Rubric Card
When displaying the graded test results to students:

```tsx
import type { EssayEvaluationResult } from "@/lib/essay-evaluator"

export function EssayEvaluationCard({ evaluation }: { evaluation: EssayEvaluationResult }) {
  return (
    <div className="rounded-xl border p-5 bg-card space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h4 className="font-semibold text-base">Essay Writing Evaluation</h4>
          <p className="text-xs text-muted-foreground">Scored by SmolLM2 Automated Essay Scoring</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            Band {evaluation.band_score} <span className="text-sm font-normal text-muted-foreground">/ 6</span>
          </div>
          <p className="text-xs font-medium text-emerald-600">Marks: {evaluation.scaled_marks}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-muted/40 rounded-lg">
          <p className="text-xs text-muted-foreground">Word Count</p>
          <p className="font-semibold text-sm">{evaluation.metrics.word_count}</p>
        </div>
        <div className="p-3 bg-muted/40 rounded-lg">
          <p className="text-xs text-muted-foreground">Sentences</p>
          <p className="font-semibold text-sm">{evaluation.metrics.sentence_count}</p>
        </div>
        <div className="p-3 bg-muted/40 rounded-lg">
          <p className="text-xs text-muted-foreground">Avg Sentence Length</p>
          <p className="font-semibold text-sm">{evaluation.metrics.avg_sentence_length} words</p>
        </div>
        <div className="p-3 bg-muted/40 rounded-lg">
          <p className="text-xs text-muted-foreground">Lexical Diversity</p>
          <p className="font-semibold text-sm">{(evaluation.metrics.lexical_diversity * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Band Descriptor */}
      <div className="p-3.5 bg-primary/5 border border-primary/10 rounded-lg text-sm">
        <span className="font-semibold text-primary">{evaluation.band_descriptor.name}: </span>
        <span className="text-muted-foreground">{evaluation.band_descriptor.description}</span>
      </div>
    </div>
  )
}
```

---

## 7. Testing & Verification

### 1. Test Service Health Directly on Port 8090
From your local computer terminal:
```bash
curl http://YOUR_VPS_IP:8090/health
```
**Expected Output:**
```json
{"status":"ok","model":"jatinmehra/Smollm2-360M-Essay-Scoring","port":8090,"threads":2}
```

### 2. Test Scoring with a 300-word Essay
```bash
curl -X POST http://YOUR_VPS_IP:8090/score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer placetrix-essay-eval-secret-key-9080" \
  -d '{
    "essay": "Technological innovation has fundamentally transformed the modern educational landscape. In previous decades, student learning was constrained by geographic access to libraries and physical classrooms. In contemporary society, internet connectivity allows immediate access to academic literature, interactive simulations, and global discourse. Moreover, intelligent tutoring systems accommodate varied learning cadences, allowing students to consolidate foundational understanding before encountering complex materials. While digital divides and distractions present genuine difficulties, the prudent incorporation of educational technology enhances student engagement and instructional efficacy worldwide.",
    "min_words": 250,
    "max_words": 350,
    "max_marks": 10.0
  }'
```

**Expected JSON Response:**
```json
{
  "band_score": 5,
  "scaled_marks": 8.33,
  "expected_score": 4.85,
  "confidence": 78.2,
  "class_probabilities": [0.001, 0.011, 0.042, 0.164, 0.782, 0.000],
  "band_descriptor": {
    "name": "Strong / Advanced",
    "description": "Well-developed ideas, varied sentence structures, fluent and precise phrasing."
  },
  "metrics": {
    "word_count": 86,
    "sentence_count": 5,
    "avg_sentence_length": 17.2,
    "lexical_diversity": 0.81,
    "length_compliance": "under_length"
  },
  "normalized_text": "..."
}
```

### 3. Check Live Resource Consumption
Run `docker stats` on your VPS:
- `placetrix-essay-scorer` runs with **~1.2 GB RAM** and **~0.1% CPU when idle**.
- Supabase containers continue running untouched with zero port or resource interference.
