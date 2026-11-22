
# TermsLens — Understand Before You Agree

**AI-Powered Terms & Conditions and Privacy Policy Analyser**

SCSE4041 Prompt Engineering Mini Project | **Team Console** | Team ID: **PE-B25-27**

**Live Prototype:** https://terms-lens-zeta.vercel.app/  
**Project Video:** https://youtu.be/awCjZNZ_xfs  
**GitHub Repository:** https://github.com/TheAyushTandon/TermsLens

## About the Project

TermsLens helps users understand lengthy Terms & Conditions and Privacy Policies in simple English.

Users can paste policy text, upload PDF/DOCX/TXT files, or provide a policy URL. The application extracts important clauses, explains legal terminology, identifies privacy concerns, verifies AI-generated claims against the original document, and produces a structured report.

### Five-Stage Prompt Engineering Pipeline

| Stage | Module | Responsibility |
|---|---|---|
| P01 | Clause Extraction | Extract important contractual clauses with original quotations. |
| P02 | Plain-Language Explanation | Explain complex clauses while preserving conditions and exceptions. |
| P03 | Risk & Privacy Analysis | Identify concerning clauses and analyse six privacy topics. |
| P04 | Evidence Verification | Verify explanations against source text and detect unsupported claims. |
| P05 | Final Report Generation | Generate a structured consumer-friendly analysis report. |

TermsLens also provides a dashboard, Clause Explorer, Executive Summary, Privacy Analysis, and Evidence Verification interface.

**Note:** Preloaded sample reports contain illustrative demonstration data and should not be confused with live Gemini analysis.

**Disclaimer:** TermsLens provides informational analysis, not professional legal advice.

---

## Live Prototype

**Website:** https://terms-lens-zeta.vercel.app/

### How to Use

1. Open the TermsLens website.
2. Navigate to **Analyze Document**.
3. Choose one of the three input methods:
   - File Upload (PDF, DOCX, TXT)
   - Paste Text
   - Website URL
4. Select the document type.
5. Enter the application or service name.
6. Click **Analyze Document**.
7. Explore the available analysis results and report sections.

Live Gemini processing depends on the deployed environment configuration.

---

## Installation and Local Setup

### Prerequisites

- Node.js 22 or later (Node.js 24 recommended)
- npm
- Google Gemini API key for live AI analysis
- PostgreSQL (optional for local in-process text analysis)

### Step 1: Clone the Repository

```bash
git clone https://github.com/TheAyushTandon/TermsLens.git
cd TermsLens
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env.local` file in the project root.

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_ENABLE_LIVE_API=true
NEXT_PUBLIC_API_BASE_URL=/api
```

The model above is an example; use a Gemini model supported by your account.

**Never commit API keys, passwords, or `.env.local` to GitHub.**

### Step 4: Start the Application

```bash
npm run dev
```

Open:

http://localhost:3000

Restart the development server after changing environment variables.

Without `NEXT_PUBLIC_ENABLE_LIVE_API=true`, the frontend uses its demonstration adapter.

### Optional: PostgreSQL and Background Worker

For PostgreSQL-backed persistence and queued processing, configure `DATABASE_URL` in `.env.local`.

Then run:

```bash
npm run migrate
npm run worker
```

Keep `npm run dev` running in another terminal.

Without `DATABASE_URL`, the text-analysis endpoint uses an in-process runner.

---

## Testing

The repository includes unit tests, validation tests, and API integration tests.

Run the complete automated suite:

```bash
npm test
```

Run text-analysis API integration tests:

```bash
npm run test:api:text
```

Run individual module tests:

```bash
npm run test:p01
npm run test:p04
npm run test:p05
```

Additional stage-specific and live Gemini tests are available in `package.json`.

Live Gemini tests require valid credentials and an available model.

Test definitions alone do not establish successful execution; actual results should be recorded separately.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| AI Model | Google Gemini API |
| Backend | Next.js API Routes |
| Prompt Engineering | Zero-shot, Role-based, Few-shot, Structured JSON |
| Validation | TypeScript contracts and evidence checks |
| Optional Database | PostgreSQL |
| Optional Queue | pg-boss |
| Version Control | Git and GitHub |
| Deployment | Vercel |

---

## Repository Structure

The source code is maintained in `src/`, while prompt experiments, evaluation data and technical documents are stored in dedicated directories.

### Faculty-Required Milestone 2 Structure

| Required Item | Location / Status |
|---|---|
| `README.md` | Project overview, setup, team details and prototype link |
| `prompts/v1/` | Existing baseline prompts for P01–P05 |
| `prompts/v2/` | V2 prompts currently in `prompts/experiments/refined-prompts/`; reorganise if required |
| `prompts/v3/` | V3 prompts currently in `prompts/experiments/refined-prompts/`; reorganise if required |
| `prompts/final/` | Final prompts to be organised, one file per stage |
| `code/` | Application implementation currently in `src/` |
| `test-data/` | Test cases currently in `experiments/`; saved actual outputs to be added |
| `docs/` | Existing technical documentation; add final report and diagrams |
| `CHANGELOG.md` | To be added with dated changes since Milestone 1 |

### Current Repository Layout

```text
TermsLens/
│
├── README.md
├── package.json
│
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── services/
│
├── prompts/
│   ├── v1/
│   └── experiments/
│       ├── refined-prompts/
│       └── prompt-change-log.md
│
├── experiments/
│   ├── test-cases.json
│   ├── expected-outputs.json
│   ├── experiment-results.csv
│   └── evaluation-rubric.md
│
├── tests/
├── docs/
└── migrations/
```

### Prompt Versions

TermsLens has five distinct prompt stages:

- P01 — Clause Extraction
- P02 — Plain-Language Explanation
- P03 — Risk & Privacy Analysis
- P04 — Evidence Verification
- P05 — Final Report Generation

Each stage has three saved versions: V1, V2 and V3.

**Total final prompt stages: 5**  
**Total saved prompt versions: 15**

---

## Team Members

**Team Name:** Team Console  
**Team ID:** PE-B25-27  
**Batch:** B25-36  
**Faculty Mentor:** Saurabh R Srivastava  
**Course:** SCSE4041 — Prompt Engineering

| Name | Enrollment Number | Contribution |
|---|---|---|
| Aashima Makani | S24CSEU1639 | P01 Clause Extraction, P02 Plain-Language Explanation, prompt testing, reel recording and documentation |
| Naitik Maurya | S24CSEU1653 | P04 Evidence Verification, hallucination detection and testing |
| Bhumika Rajput | S24CSEU0883 | P03 Risk & Privacy Analysis and prompt refinement |
| Ayush Tandon | S24CSEU0134 | Frontend development, UI/UX and Vercel deployment |
| Laalithya N J | S24CSEU0066 | P05 Final Report Generation and pipeline integration |

---

## Milestone 2 Deliverables

The Milestone 2 submission includes:

1. Main Milestone 2 Project Report (seven required sections)
2. Supporting Technical Report
3. Public GitHub Repository
4. Deployed TermsLens Prototype
5. Project Demonstration Video

### Project Links

**Prototype:** https://terms-lens-zeta.vercel.app/

**Repository:** https://github.com/TheAyushTandon/TermsLens

**Demonstration Video:** https://youtu.be/awCjZNZ_xfs

The final report should include full final prompts, a documented test table with actual results, real-run screenshots, a repository screenshot and agreed team contributions.

---

## Future Scope

- Improve analysis of lengthy and complex legal policies.
- Expand evaluation across diverse document types.
- Improve reliability of risk classifications.
- Strengthen hallucination detection and source verification.
- Optimise document processing and report generation.

---

**TermsLens — Understand Before You Agree.**
