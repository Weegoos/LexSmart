import json
import os
import re
import logging

import httpx
from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.db.vector_db import get_collection
from app.schemas.contract import ContractCreate, ValidationResult, ValidationWarning

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

# --- Prompts ---

SYSTEM_PROMPT = """Ты — эксперт по трудовому праву Республики Казахстан (Трудовой кодекс 2026 года).

ВАЖНО: Тебе предоставлены СТРУКТУРИРОВАННЫЕ ДАННЫЕ формы, которые будут использованы для заполнения стандартного шаблона трудового договора. Шаблон уже содержит все обязательные разделы статьи 28 ТК РК (реквизиты сторон, права и обязанности, охрана труда, порядок изменения и прекращения и т.д.).

Твоя задача — проверять ТОЛЬКО КОНКРЕТНЫЕ ЗНАЧЕНИЯ предоставленных полей на соответствие ТК РК:
- Соответствует ли размер зарплаты минимальному (статья 121)
- Соответствует ли испытательный срок допустимым нормам (статья 36: не более 3 месяцев, 0 = без испытания)
- Соответствует ли количество дней отпуска минимуму (статья 88: не менее 24 календарных дней)
- Правильность формата дат и сроков договора
- Соответствие режима работы нормам (статья 68: не более 40 часов в неделю при 5/2)
- Наличие и корректность ИИН/БИН (12 цифр)
- Дополнительные условия — если указаны, проверь их на противоречие ТК РК

НЕ ДЕЛАЙ замечания о том, что в данных отсутствуют:
- Обязанности работника/работодателя (они есть в шаблоне)
- Условия охраны труда (они есть в шаблоне)
- Основания прекращения договора (они есть в шаблоне)
- Социальные отчисления и пенсионные взносы (регулируются отдельными законами, не ТК)
- Любые другие разделы, которые стандартно включаются в шаблон договора

Если значения корректны и нарушений нет — верни is_compliant: true и пустой массив warnings.

Для каждого реального нарушения укажи:
1. Конкретную статью ТК РК
2. Серьёзность: "high" (прямое нарушение), "medium" (потенциальный риск), "low" (рекомендация)
3. Чёткое пояснение на русском языке

Ответь ТОЛЬКО валидным JSON (без markdown, без ```):
{
  "is_compliant": true или false,
  "warnings": [
    {"article": "Статья N", "severity": "high|medium|low", "message": "..."}
  ],
  "recommendations": ["..."]
}
"""

USER_PROMPT_TEMPLATE = """Проверь значения полей трудового договора на соответствие Трудовому кодексу РК.

Тип организации: {org_type}
Работодатель: {employer_name} (ИИН/БИН: {employer_iin_bin})
Работник: {employee_name} (ИИН: {employee_iin})
Должность: {position}
Зарплата: {salary} {currency}
Дата начала: {start_date}
Дата окончания: {end_date} (если "бессрочный" — договор на неопределённый срок, это законно)
Испытательный срок: {probation_months} месяцев (0 = без испытательного срока — это законно)
Режим работы: {work_schedule}
Отпуск: {vacation_days} дней
Дополнительные условия: {custom_clauses}

Релевантные статьи Трудового кодекса для проверки:
{context}
"""


# --- Ingestion ---

def ingest_labor_code() -> int:
    """Parse, chunk, and store the Labor Code into ChromaDB. Returns chunk count."""
    txt_path = os.path.join(DATA_DIR, "labor_code_2026.txt")

    if not os.path.exists(txt_path):
        raise FileNotFoundError(
            f"{txt_path} not found. Convert labor_code_2026.docx to .txt first."
        )

    with open(txt_path, "r", encoding="utf-8") as f:
        text = f.read()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " "],
    )
    chunks = splitter.split_text(text)

    collection = get_collection()

    # Clear existing data and re-insert
    try:
        existing = collection.count()
        if existing > 0:
            collection.delete(where={"source": "labor_code_2026"})
    except Exception:
        pass

    # ChromaDB will auto-embed documents using its built-in model
    collection.add(
        ids=[f"chunk_{i}" for i in range(len(chunks))],
        documents=chunks,
        metadatas=[{"source": "labor_code_2026", "chunk_index": i} for i in range(len(chunks))],
    )

    logger.info(f"Ingested {len(chunks)} chunks into ChromaDB")
    return len(chunks)


# --- Query ---

def _retrieve_context(query: str, n_results: int = 5) -> str:
    """Retrieve relevant Labor Code chunks for the given query."""
    collection = get_collection()
    results = collection.query(query_texts=[query], n_results=n_results)

    documents = results.get("documents", [[]])[0]
    return "\n\n---\n\n".join(documents) if documents else "Релевантные статьи не найдены."


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Strip markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    return json.loads(cleaned)


async def _call_llm(system: str, user: str) -> str:
    """Call Alem AI LLM via httpx directly (avoids LangChain connection issues in Docker)."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.OPENAI_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.LLM_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def validate_contract(data: ContractCreate) -> ValidationResult:
    """Run RAG compliance check on contract data."""
    # Build query from key contract terms
    query_parts = [
        f"трудовой договор {data.org_type}",
        f"должность {data.position}",
        f"заработная плата {data.salary}",
        f"испытательный срок {data.probation_months} месяцев",
        f"отпуск {data.vacation_days} дней",
        f"режим работы {data.work_schedule}",
    ]
    if data.custom_clauses:
        query_parts.append(data.custom_clauses)

    query = " ".join(query_parts)

    logger.info("Retrieving context from ChromaDB...")
    context = _retrieve_context(query)
    logger.info(f"Retrieved context ({len(context)} chars). Calling LLM...")

    user_prompt = USER_PROMPT_TEMPLATE.format(
        org_type=data.org_type,
        employer_name=data.employer_name,
        employer_iin_bin=data.employer_iin_bin,
        employee_name=data.employee_name,
        employee_iin=data.employee_iin,
        position=data.position,
        salary=data.salary,
        currency=data.currency,
        start_date=data.start_date,
        end_date=data.end_date or "бессрочный",
        probation_months=data.probation_months,
        work_schedule=data.work_schedule,
        vacation_days=data.vacation_days,
        custom_clauses=data.custom_clauses or "Нет",
        context=context,
    )

    try:
        content = await _call_llm(SYSTEM_PROMPT, user_prompt)
        logger.info(f"LLM responded ({len(content)} chars). Parsing...")

        result_data = _extract_json(content)

        return ValidationResult(
            is_compliant=result_data.get("is_compliant", False),
            warnings=[
                ValidationWarning(**w) for w in result_data.get("warnings", [])
            ],
            recommendations=result_data.get("recommendations", []),
        )

    except httpx.TimeoutException:
        logger.error("LLM request timed out after 60s")
        return ValidationResult(
            is_compliant=False,
            warnings=[
                ValidationWarning(
                    article="N/A",
                    severity="high",
                    message="Превышено время ожидания ответа от AI. Попробуйте снова.",
                )
            ],
            recommendations=["Повторите проверку позже."],
        )

    except Exception as e:
        logger.error(f"RAG validation failed: {e}")
        return ValidationResult(
            is_compliant=False,
            warnings=[
                ValidationWarning(
                    article="N/A",
                    severity="high",
                    message=f"Ошибка проверки: {str(e)}. Попробуйте снова.",
                )
            ],
            recommendations=["Повторите проверку или обратитесь к юристу."],
        )


# --- CLI entry point for ingestion ---
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "ingest":
        count = ingest_labor_code()
        print(f"Ingested {count} chunks")
    else:
        print("Usage: python -m app.services.rag_engine ingest")
