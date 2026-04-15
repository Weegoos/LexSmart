# LexSmart — Frontend

Next.js 15 приложение для генерации и проверки трудовых договоров.

---

## Технологии

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Geist** (шрифт от Vercel)

---

## Структура папок

```
frontend/
├── Dockerfile                  # Docker-образ для контейнера
├── package.json
├── next.config.ts
├── tsconfig.json
│
└── src/
    ├── app/                    # App Router — страницы и layout
    │   ├── layout.tsx          # Корневой layout (шрифт, AuthProvider, body)
    │   ├── globals.css         # Глобальные стили + Tailwind
    │   ├── page.tsx            # Корневая страница (редирект на /dashboard)
    │   │
    │   ├── login/
    │   │   └── page.tsx        # Страница входа
    │   ├── register/
    │   │   └── page.tsx        # Страница регистрации
    │   ├── dashboard/
    │   │   └── page.tsx        # Список договоров
    │   └── contract/
    │       └── new/
    │           └── page.tsx    # Форма создания договора (3 шага)
    │
    ├── components/
    │   └── Header.tsx          # Шапка с логотипом и кнопкой выхода
    │
    ├── lib/
    │   ├── api.ts              # Все запросы к бэкенду (fetch-обёртки)
    │   └── auth-context.tsx    # React Context: токен, пользователь, logout
    │
    └── types/
        └── index.ts            # TypeScript интерфейсы (ContractCreate, User и др.)
```

---

## Запуск через Docker (рекомендуется)

Фронтенд запускается **в составе всего проекта** через Docker Compose.
Подробная инструкция — в корневом [`README.md`](../README.md).

```bash
# Из корня проекта
make up
```

Фронтенд будет доступен на `http://localhost:3000`.

---

## Локальный запуск без Docker

Если нужно запустить только фронтенд отдельно (например, для быстрой правки UI):

### Требования
- Node.js 20+
- npm 10+

### Шаги

```bash
cd frontend
npm install
```

Создайте файл `.env.local` в папке `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Откройте http://localhost:3000.

> Бэкенд при этом должен быть запущен (через Docker или локально на порту 8000).

---

## Доступные npm-команды

```bash
npm run dev      # Запустить dev-сервер с HMR (hot reload)
npm run build    # Собрать production-сборку
npm run start    # Запустить production-сборку
npm run lint     # Проверить код линтером (ESLint)
```

---

## Как устроена авторизация

Авторизация реализована через **JWT токен** в `localStorage`:

1. При входе (`/login`) или регистрации (`/register`) бэкенд возвращает `access_token`
2. Токен сохраняется в `localStorage` через `AuthContext`
3. Все запросы к API автоматически получают заголовок `Authorization: Bearer <token>`
4. При выходе токен удаляется, пользователь редиректится на `/login`

Весь этот механизм находится в `src/lib/auth-context.tsx`.

---

## Как устроены запросы к API

Все запросы к бэкенду находятся в `src/lib/api.ts`.

Базовый URL берётся из переменной окружения:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

| Функция | Метод | Endpoint |
|---|---|---|
| `register()` | POST | `/api/v1/auth/register` |
| `login()` | POST | `/api/v1/auth/login` |
| `getMe()` | GET | `/api/v1/users/me` |
| `listContracts()` | GET | `/api/v1/contracts` |
| `validateContract()` | POST | `/api/v1/contracts/validate` |
| `generateContract()` | POST | `/api/v1/contracts/generate` |

---

## Страница создания договора — 3 шага

`/contract/new` работает в три этапа:

1. **`form`** — пользователь заполняет поля (работодатель, работник, условия)
2. **`validation`** — бэкенд возвращает результат RAG-проверки: список предупреждений и рекомендаций
3. **`done`** — пользователь нажимает "Скачать .docx", браузер скачивает файл

Состояние шагов хранится локально в `useState`, между запросами ничего не сохраняется в URL.

---

## Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL бэкенда | `http://localhost:8000` |

`NEXT_PUBLIC_` prefix означает, что переменная доступна в браузере (попадает в JS-бандл). Не кладите сюда секреты.
