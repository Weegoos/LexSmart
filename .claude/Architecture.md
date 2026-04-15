# LexSmart Kazakhstan: MVP Architecture Specification

## 1. Project Overview

**LexSmart Kazakhstan** is an automated legal compliance platform aimed at preventing labor disputes.
**MVP Scope Strict Constraint:** This implementation is strictly limited to the creation and validation of labor contracts for IE (Individual Entrepreneurs / ИП) and LLP (Limited Liability Partnerships / ТОО). No external integrations (e.g., digital signatures, complex HR scheduling) are included in this phase.

## 2. Technology Stack

* **Frontend:** Next.js (React), styled with Tailwind CSS.
* **Backend:** FastAPI (Python).
* **AI / NLP (RAG):** * Framework: LangChain or LlamaIndex.
  * Vector Database: ChromaDB (or pgvector).
  * Knowledge Base: Static dump of the 2026 Labor Code of the Republic of Kazakhstan.
* **Document Generation:** `python-docx` for `.docx` template population.
* **Database (Relational):** PostgreSQL (for users, contract metadata, and history).
* **Infrastructure:** Docker & Docker Compose for containerization; deployed via open-source tools (e.g., Dokku or standard Docker Swarm) on a VPS.

## 3. Core System Workflows

### 3.1. Document Generation Workflow

1. **User Input:** User fills out a form in the Next.js frontend with employee details, salary, probation terms, etc.
2. **API Request:** Next.js sends a JSON payload to the FastAPI `/api/v1/contracts/generate` endpoint.
3. **Template Processing:** FastAPI uses `python-docx` to load a predefined `.docx` template for IE or LLP. It replaces placeholder tags (e.g., `{{EMPLOYEE_NAME}}`, `{{SALARY}}`) with the provided JSON data.
4. **Response:** The generated `.docx` file is saved temporarily or returned directly as a downloadable blob to the frontend.

### 3.2. RAG Compliance Check Workflow

1. **Data Ingestion (One-time/Admin task):** * The 2026 Labor Code document is parsed, chunked, and converted into embeddings.
   * These embeddings are stored in the Vector Database.
2. **Risk Analysis:**
   * When a user inputs custom clauses or non-standard terms into the contract generation form, FastAPI triggers the RAG service.
   * The system queries the Vector DB to find relevant articles from the 2026 Labor Code.
   * An LLM evaluates the user's input against the retrieved Labor Code articles to identify contradictions or missing mandatory clauses.
3. **Feedback:** The backend returns an array of `warnings` and `recommendations` to the frontend before the user finalizes the document.

## 4. Infrastructure & Deployment

The system utilizes a containerized approach for easy deployment and isolation.

* **`frontend` container:** Next.js application running on port 3000.
* **`backend` container:** FastAPI application running on Uvicorn (port 8000).
* **`postgres` container:** Relational database for user state.
* **`vectordb` container:** ChromaDB instance (if running as a separate service).

---

## 5. Directory and File Structure

This structure assumes a Monorepo pattern, which is easiest for MVP development and CI/CD.

```text
Task/
│
├── .gitignore
├── README.md
├── docker-compose.yml         # Defines all services (frontend, backend, db)
├── Makefile                   # Helper commands (make up, make build, make migrate)
│
├── frontend/                  # Next.js Application
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── app/               # App router (pages: /dashboard, /contract/new)
│   │   ├── components/        # Reusable UI components (Forms, Buttons, Modals)
│   │   ├── lib/               # Utility functions, API clients (Axios/Fetch)
│   │   ├── types/             # TypeScript interfaces
│   │   └── styles/            # Tailwind global styles
│   └── public/                # Static assets (logos, icons)
│
└── backend/                   # FastAPI Application
    ├── Dockerfile
    ├── requirements.txt       # Python dependencies
    ├── main.py                # FastAPI application entry point
    │
    ├── app/
    │   ├── api/               # API Routers
    │   │   ├── v1/
    │   │   │   ├── auth.py
    │   │   │   ├── contracts.py  # Endpoints for generation & validation
    │   │   │   └── users.py
    │   │
    │   ├── core/              # Configuration & Security
    │   │   ├── config.py      # Environment variables loading
    │   │   └── security.py    # JWT, Hashing
    │   │
    │   ├── db/                # Database connections
    │   │   ├── session.py     # SQLAlchemy / Postgres setup
    │   │   └── vector_db.py   # ChromaDB / Vector setup
    │   │
    │   ├── models/            # SQLAlchemy ORM Models (Relational)
    │   │   └── user.py
    │   │
    │   ├── schemas/           # Pydantic Models (Data validation)
    │   │   ├── contract.py
    │   │   └── user.py
    │   │
    │   └── services/          # Core Business Logic
    │       ├── docgen.py      # python-docx template population logic
    │       └── rag_engine.py  # LLM calls, embedding generation, compliance checking
    │
    ├── templates/             # Static .docx templates
    │   ├── labor_contract_ip.docx
    │   └── labor_contract_too.docx
    │
    └── data/                  # Source files for RAG
        └── labor_code_2026.txt
```
