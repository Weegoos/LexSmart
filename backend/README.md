# LexSmart — Backend

FastAPI приложение: генерация `.docx` трудовых договоров и RAG-проверка соответствия Трудовому кодексу РК.

---

## Технологии

- **FastAPI** — REST API
- **SQLAlchemy 2.0** (async) + **asyncpg** — работа с PostgreSQL
- **Alembic** — миграции базы данных
- **Pydantic v2** — валидация данных
- **python-jose** — JWT авторизация
- **passlib + bcrypt** — хеширование паролей
- **python-docx** — генерация `.docx` файлов из шаблонов
- **ChromaDB** — векторная база данных для RAG
- **LangChain** — разбивка текста на чанки при индексации
- **httpx** — HTTP-клиент для запросов к LLM API

---

## Структура папок

```
backend/
├── Dockerfile
├── requirements.txt
├── main.py                     # Точка входа: FastAPI app, CORS, роутеры
│
├── alembic/                    # Миграции базы данных
│   ├── env.py
│   └── versions/               # Файлы миграций (генерируются автоматически)
│
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py         # POST /register, POST /login
│   │       ├── users.py        # GET /users/me
│   │       └── contracts.py    # POST /generate, POST /validate, GET /
│   │
│   ├── core/
│   │   ├── config.py           # Настройки из .env (Pydantic Settings)
│   │   └── security.py         # JWT: создание и верификация токенов
│   │
│   ├── db/
│   │   ├── session.py          # SQLAlchemy engine, Base, get_db()
│   │   └── vector_db.py        # ChromaDB клиент и коллекция
│   │
│   ├── models/
│   │   ├── user.py             # ORM модель User
│   │   └── contract.py         # ORM модель Contract
│   │
│   ├── schemas/
│   │   ├── user.py             # Pydantic схемы: UserCreate, UserResponse, TokenResponse
│   │   └── contract.py         # ContractCreate, ValidationResult, ValidationWarning
│   │
│   └── services/
│       ├── docgen.py           # Генерация .docx из шаблона (python-docx)
│       └── rag_engine.py       # RAG: индексация, поиск, вызов LLM
│
├── templates/
│   ├── labor_contract_ip.docx  # Шаблон договора для ИП
│   └── labor_contract_too.docx # Шаблон договора для ТОО
│
└── data/
    └── labor_code_2026.txt     # Трудовой кодекс РК в текстовом формате
```

---

## Запуск через Docker (рекомендуется)

Бэкенд запускается **в составе всего проекта** через Docker Compose.
Подробная инструкция — в корневом [`README.md`](../README.md).

```bash
# Из корня проекта:
make up          # запустить контейнеры
make migrate     # применить миграции
make seed        # загрузить Трудовой кодекс в ChromaDB
```

API будет доступен на `http://localhost:8000`.
Swagger документация: `http://localhost:8000/docs`.

---

## Локальный запуск без Docker

### Требования
- Python 3.11+
- PostgreSQL 16 (локально или в Docker)
- ChromaDB (локально или в Docker)

### Шаги

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Создайте `.env` в папке `backend/` (или в корне проекта):

```env
DATABASE_URL=postgresql+asyncpg://lexsmart:lexsmart_secret@localhost:5432/lexsmart
CHROMA_HOST=localhost
CHROMA_PORT=8000
OPENAI_API_KEY=sk-ваш-ключ
OPENAI_BASE_URL=https://llm.alem.ai/v1
LLM_MODEL=alemllm
SECRET_KEY=замените-на-случайную-строку
```

```bash
alembic upgrade head             # применить миграции
python -m app.services.rag_engine ingest   # загрузить Трудовой кодекс
uvicorn main:app --reload        # запустить сервер
```

---

## API эндпоинты

### Auth

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Регистрация нового пользователя |
| `POST` | `/api/v1/auth/login` | Вход, возвращает JWT токен |

**Пример запроса на регистрацию:**
```json
POST /api/v1/auth/register
{
  "email": "user@example.kz",
  "password": "secret123",
  "full_name": "Иванов Иван",
  "org_type": "IP"
}
```

### Users

| Метод | Путь | Описание | Авторизация |
|---|---|---|---|
| `GET` | `/api/v1/users/me` | Данные текущего пользователя | Bearer JWT |

### Contracts

| Метод | Путь | Описание | Авторизация |
|---|---|---|---|
| `GET` | `/api/v1/contracts` | Список договоров пользователя | Bearer JWT |
| `POST` | `/api/v1/contracts/validate` | RAG-проверка договора, возвращает JSON с предупреждениями | Bearer JWT |
| `POST` | `/api/v1/contracts/generate` | Генерирует и возвращает `.docx` файл | Bearer JWT |

**Пример тела запроса для `/validate` и `/generate`:**
```json
{
  "org_type": "IP",
  "employer_name": "ИП Иванов Иван",
  "employer_iin_bin": "123456789012",
  "employer_address": "г. Алматы, ул. Абая, 1",
  "employee_name": "Петров Пётр Петрович",
  "employee_iin": "987654321098",
  "employee_address": "г. Алматы, ул. Ленина, 5",
  "position": "Инженер-программист",
  "salary": 350000,
  "currency": "KZT",
  "start_date": "2026-05-01",
  "end_date": null,
  "probation_months": 0,
  "work_schedule": "5/2",
  "vacation_days": 24,
  "custom_clauses": ""
}
```

**Ответ `/validate`:**
```json
{
  "is_compliant": true,
  "warnings": [],
  "recommendations": []
}
```

---

## База данных и миграции

Проект использует **Alembic** для управления схемой PostgreSQL.

### Основные команды

```bash
# Применить все непримененные миграции (обновить БД до актуального состояния)
make migrate
# или напрямую:
docker compose exec backend alembic upgrade head

# Создать новую миграцию (после изменения ORM-модели)
make makemigrations msg="add column phone to users"
# или напрямую:
docker compose exec backend alembic revision --autogenerate -m "add column phone to users"

# Посмотреть историю миграций
docker compose exec backend alembic history

# Посмотреть текущую версию БД
docker compose exec backend alembic current

# Откатить последнюю миграцию
docker compose exec backend alembic downgrade -1
```

### Как добавить новое поле в модель

1. Отредактируйте ORM-модель в `app/models/`
2. Создайте миграцию: `make makemigrations msg="описание изменения"`
3. Примените: `make migrate`
4. Alembic автоматически сгенерирует SQL (`ALTER TABLE ...`)

---

## RAG-система (как работает проверка договора)

### Архитектура

```
Пользователь заполняет форму
        │
        ▼
POST /api/v1/contracts/validate
        │
        ▼
rag_engine.py::validate_contract()
        │
        ├── 1. Строит поисковый запрос из полей формы
        │
        ├── 2. ChromaDB.query() — находит 5 наиболее
        │      релевантных статей Трудового кодекса
        │
        ├── 3. Формирует prompt: данные договора + найденные статьи
        │
        └── 4. LLM (Alem AI) анализирует и возвращает JSON:
               { is_compliant, warnings[], recommendations[] }
```

### Первоначальная индексация (make seed)

```bash
make seed
# или:
docker compose exec backend python -m app.services.rag_engine ingest
```

Команда:
1. Читает `data/labor_code_2026.txt`
2. Разбивает текст на чанки по 1000 символов (с перекрытием 200)
3. ChromaDB генерирует эмбеддинги через встроенную модель `all-MiniLM-L6-v2`
4. Сохраняет чанки в коллекцию `labor_code_2026`

Данные хранятся в Docker volume `chromadata` и **не теряются** при перезапуске контейнеров.

> **Важно:** при `docker compose down -v` (флаг `-v`) volumes удаляются. После этого нужно снова выполнить `make seed`.

### Проверить количество чанков в ChromaDB

```bash
docker compose exec backend python -c "
from app.db.vector_db import get_collection
print('Чанков в ChromaDB:', get_collection().count())
"
```

Должно быть ~600 чанков.

---

## Генерация документов (python-docx)

Шаблоны договоров находятся в `templates/`:
- `labor_contract_ip.docx` — для ИП
- `labor_contract_too.docx` — для ТОО

Шаблоны содержат плейсхолдеры вида `{{EMPLOYEE_NAME}}`, `{{SALARY}}` и т.д.
Сервис `docgen.py` заменяет их на данные из формы и возвращает файл как `StreamingResponse`.

### Полный список плейсхолдеров

| Плейсхолдер | Поле формы |
|---|---|
| `{{EMPLOYER_NAME}}` | Наименование работодателя |
| `{{EMPLOYER_IIN_BIN}}` | ИИН/БИН работодателя |
| `{{EMPLOYER_ADDRESS}}` | Адрес работодателя |
| `{{EMPLOYEE_NAME}}` | ФИО работника |
| `{{EMPLOYEE_IIN}}` | ИИН работника |
| `{{EMPLOYEE_ADDRESS}}` | Адрес работника |
| `{{POSITION}}` | Должность |
| `{{SALARY}}` | Зарплата (форматирована: `350 000 KZT`) |
| `{{START_DATE}}` | Дата начала (формат: `01.05.2026`) |
| `{{END_DATE}}` | Дата окончания или `бессрочный / indefinite` |
| `{{PROBATION_MONTHS}}` | Испытательный срок в месяцах |
| `{{WORK_SCHEDULE}}` | Режим работы |
| `{{VACATION_DAYS}}` | Дней отпуска |
| `{{CUSTOM_CLAUSES}}` | Дополнительные условия |
| `{{CURRENT_DATE}}` | Дата заключения (сегодня) |

---

## Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql+asyncpg://user:pass@postgres:5432/db` |
| `SECRET_KEY` | Секрет для подписи JWT (min 32 символа) | `your-random-secret` |
| `ALGORITHM` | Алгоритм JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Время жизни токена | `60` |
| `CHROMA_HOST` | Хост ChromaDB | `chromadb` (в Docker) или `localhost` |
| `CHROMA_PORT` | Порт ChromaDB | `8000` |
| `OPENAI_API_KEY` | API ключ LLM (Alem AI) | `sk-...` |
| `OPENAI_BASE_URL` | Базовый URL LLM API | `https://llm.alem.ai/v1` |
| `LLM_MODEL` | Название модели | `alemllm` |
| `EMBED_API_KEY` | API ключ для эмбеддингов | `sk-...` |
| `EMBED_BASE_URL` | Базовый URL эмбеддингов | `https://llm.alem.ai/v1` |
| `EMBED_MODEL` | Модель эмбеддингов | `text-1024` |

> В Docker ChromaDB называется `chromadb` (имя сервиса в docker-compose.yml). При локальном запуске без Docker — `localhost`.

---

## Полезные команды для отладки

```bash
# Войти в bash контейнера бэкенда
make backend-shell

# Открыть psql
make psql
# Посмотреть таблицы:
\dt
# Посмотреть пользователей:
SELECT id, email, org_type FROM users;

# Логи только бэкенда
docker compose logs -f backend

# Проверить health
curl http://localhost:8000/health
# Ответ: {"status": "ok"}

# Проверить Swagger
open http://localhost:8000/docs
```
