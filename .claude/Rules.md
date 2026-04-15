# LexSmart Kazakhstan: AI Assistant (Claude Code) Development Rules

## 1. Project Context & Constraints

* **Project:** LexSmart Kazakhstan (LegalTech MVP).
* **Goal:** Automate the generation and RAG-based compliance validation of labor contracts for IE (ИП) and LLP (ТОО) against the 2026 Labor Code of the Republic of Kazakhstan.
* **Stack:** Next.js (App Router, Tailwind, TS), FastAPI (Python 3.10+), PostgreSQL, ChromaDB, `python-docx`.
* **MVP Strict Constraint:** Do not build features outside of creating and validating IE/LLP labor contracts. Ignore digital signatures, complex HR scheduling, or multi-tenant SSO unless explicitly requested.

## 2. General AI Behavior

* **Be Concise:** Provide direct, copy-pasteable code. Minimize conversational filler and philosophical explanations.
* **Think Step-by-Step:** When designing a complex function (especially RAG pipelines), outline the logical steps in comments before writing the code.
* **Don't Break Existing Code:** When modifying a file, ensure changes do not break the defined architecture or imports. If a change requires updating other files, list them explicitly.
* **Fail Fast & Explicitly:** If a requested feature conflicts with the MVP scope or is technically unfeasible with the current stack, say so immediately and propose the simplest alternative.

## 3. Backend Rules (FastAPI & Python)

* **Type Hinting:** Enforce strict Python type hinting for all function arguments and return types.
* **Pydantic V2:** Use Pydantic V2 features for schema validation (`BaseModel`, `Field`, etc.). Ensure request and response models are clearly separated in `schemas/`.
* **Separation of Concerns:** * **Routers (`api/`):** Should only handle HTTP requests, input validation, and HTTP responses.
  * **Services (`services/`):** Must contain all business logic (e.g., document generation, AI calls). Routers call Services.
* **Async/Await:** Use asynchronous programming (`async def`) for database calls, file I/O, and external LLM API requests to prevent blocking the event loop.
* **Environment Variables:** Never hardcode API keys, database URLs, or secret strings. Always use `app/core/config.py` relying on `.env` files.

## 4. Frontend Rules (Next.js & TypeScript)

* **App Router:** Use the Next.js App Router (`app/` directory).
* **Server vs. Client Components:** Default to Server Components for performance. Use `"use client"` only when interactivity, hooks (`useState`, `useEffect`), or browser APIs are required.
* **TypeScript:** Write strict TypeScript. Avoid `any`. Define interfaces or types for all API responses and component props in `src/types/`.
* **Styling:** Use Tailwind CSS for all styling. Avoid custom CSS files unless absolutely necessary.
* **API Fetching:** Create dedicated helper functions for API calls (e.g., in `src/lib/api.ts`) rather than writing `fetch` or `axios` calls directly inside UI components.

## 5. RAG & AI Integration Rules

* **Modularity:** Isolate interactions with ChromaDB and the LLM API into dedicated wrapper classes or functions within `services/rag_engine.py`.
* **Prompt Engineering:** Store system prompts and user prompt templates as constant strings or in a dedicated configuration file, not buried deep inside functional logic.
* **Error Handling:** LLM APIs and Vector DBs can timeout or fail. Implement robust `try/except` blocks and return meaningful error messages to the frontend if the compliance check fails.
* **Context Limit Awareness:** When fetching chunks from ChromaDB to send to the LLM, strictly manage the token count to avoid exceeding the context window of the chosen model.

## 6. Document Generation Rules (`python-docx`)

* **Non-Destructive Editing:** When replacing tags (e.g., `{{EMPLOYEE_NAME}}`) in `.docx` templates, ensure the original formatting (bolding, font size) of the paragraph is preserved.
* **Stateless Generation:** Do not permanently save generated `.docx` files to the local container file system. Keep them in memory (`io.BytesIO`) to return to the user, or use ephemeral storage that is cleaned up immediately.
