# LexSmart Kazakhstan

Автоматизированная платформа правовой проверки трудовых договоров для ИП и ТОО на базе RAG + LLM.

Система генерирует `.docx`-договор по данным формы и проверяет его на соответствие **Трудовому кодексу РК 2026** с помощью векторного поиска (ChromaDB) и языковой модели (Alem AI).

---

## Технологии

| Слой                     | Технология                       |
| ---------------------------- | ------------------------------------------ |
| Frontend                     | Next.js 15, React 19, Tailwind CSS         |
| Backend                      | FastAPI, Python 3.11, SQLAlchemy (async)   |
| База данных        | PostgreSQL 16                              |
| Векторная БД      | ChromaDB 0.6.3                             |
| LLM / RAG                    | Alem AI (OpenAI-compatible API), LangChain |
| Документы           | python-docx                                |
| Авторизация       | JWT (python-jose)                          |
| Инфраструктура | Docker, Docker Compose                     |

---

## Быстрый старт (запуск всего проекта)

### 1. Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — версия 24+
- [GNU Make](https://www.gnu.org/software/make/) — на macOS установлен по умолчанию; на Windows — через [Chocolatey](https://chocolatey.org/): `choco install make`

Больше ничего не нужно: Node.js и Python устанавливаются **внутри контейнеров**.

### 2. Клонировать репозиторий

```bash
git clone https://github.com/RainPythonDeveloper/LexSmart.git
```

### 3. Настроить переменные окружения

```bash
cp .env.example .env
```

Откройте `.env` и заполните ключи:

```env
# LLM (получить на llm.alem.ai)
OPENAI_API_KEY=sk-ваш-ключ
EMBED_API_KEY=sk-ваш-ключ-эмбеддингов

# JWT секрет — замените на случайную строку
SECRET_KEY=замените-на-случайную-строку-из-32-символов
```

Всё остальное оставьте как есть для локальной разработки.

### 4. Собрать и запустить контейнеры

```bash
make build   # собрать образы (первый раз ~3-5 минут)
make up      # запустить все 4 сервиса в фоне
```

### 5. Применить миграции базы данных

```bash
make migrate
```

Это создаст таблицы `users` и `contracts` в PostgreSQL.

### 6. Загрузить Трудовой кодекс в векторную базу

```bash
make seed
```

Команда парсит `backend/data/labor_code_2026.txt`, разбивает на чанки и загружает в ChromaDB. **Выполняется один раз.** При первом запуске ChromaDB скачает модель эмбеддингов (~80 МБ) — это нормально.

### 7. Открыть приложение

| Сервис                           | URL                        |
| -------------------------------------- | -------------------------- |
| Frontend (приложение)        | http://localhost:3000      |
| Backend API                            | http://localhost:8000      |
| API документация (Swagger) | http://localhost:8000/docs |
| ChromaDB                               | http://localhost:8100      |
| PostgreSQL                             | localhost:5434             |

---

## Все команды Make

```bash
make up              # Запустить все контейнеры в фоновом режиме
make down            # Остановить и удалить контейнеры
make build           # Собрать Docker-образы
make rebuild         # Пересобрать образы с нуля (без кэша)
make logs            # Смотреть логи всех сервисов в реальном времени
make migrate         # Применить миграции Alembic (обновить схему БД)
make makemigrations msg="описание"  # Создать новую миграцию
make seed            # Загрузить Трудовой кодекс в ChromaDB
make backend-shell   # Открыть bash внутри контейнера backend
make frontend-shell  # Открыть sh внутри контейнера frontend
make psql            # Подключиться к PostgreSQL через psql
```

---

## Архитектура контейнеров

```
┌─────────────────────────────────────────────────────┐
│                   Docker Network                    │
│                                                     │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │   frontend   │────▶│        backend           │  │
│  │  Next.js     │     │  FastAPI + Uvicorn        │  │
│  │  port: 3000  │     │  port: 8000              │  │
│  └──────────────┘     └──────┬───────────┬───────┘  │
│                              │           │           │
│                    ┌─────────▼──┐  ┌─────▼────────┐ │
│                    │  postgres  │  │   chromadb   │ │
│                    │  port:5432 │  │  port: 8000  │ │
│                    └────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────┘

Снаружи Docker (ваш браузер / curl):
  localhost:3000  → frontend
  localhost:8000  → backend
  localhost:5434  → postgres (5434 на хосте → 5432 в контейнере)
  localhost:8100  → chromadb (8100 на хосте → 8000 в контейнере)
```

**Почему порты разные?** ChromaDB и backend оба используют порт 8000 внутри Docker-сети. На хосте ChromaDB выставлен на 8100, чтобы не конфликтовать.

---

## Структура проекта

```
Task/
├── .env.example           # Шаблон переменных окружения
├── .env                   # Ваши секреты (не коммитить!)
├── docker-compose.yml     # Описание всех 4 сервисов
├── Makefile               # Удобные команды
├── labor_code_2026.docx   # Исходник Трудового кодекса
│
├── frontend/              # Next.js приложение → см. frontend/README.md
└── backend/               # FastAPI приложение → см. backend/README.md
```

---

## Workflow разработки

### Горячая перезагрузка (Hot Reload)

Оба сервиса работают в режиме автоперезагрузки:

- **Frontend**: Next.js HMR — правите `.tsx`-файл, браузер обновляется мгновенно
- **Backend**: Uvicorn `--reload` — правите `.py`-файл, сервер перезапускается автоматически

Это работает потому что папки `./frontend` и `./backend` примонтированы в контейнеры как тома (`volumes`).

### Если нужно пересобрать контейнер

После изменения `requirements.txt` или `package.json`:

```bash
make rebuild
make up
```

### Смотреть логи только одного сервиса

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f chromadb
```

---

## Частые проблемы

**Порт уже занят**

```
Error: port is already allocated
```

Остановите локальный PostgreSQL или Node.js: `make down`, затем снова `make up`.

**Миграции не применились**

```bash
make backend-shell
alembic history  # посмотреть историю
alembic current  # текущая версия
```

**ChromaDB пустой после перезапуска**
ChromaDB хранит данные в Docker volume `chromadata`. Если вы сделали `docker compose down -v` (с флагом `-v`), volume удаляется. Снова выполните `make seed`.

**CORS ошибка**
Убедитесь что `NEXT_PUBLIC_API_URL=http://localhost:8000` в `.env` и backend запущен (`make logs`).
