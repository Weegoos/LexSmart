from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import Base, engine
from app.api.v1 import auth, users, contracts

app = FastAPI(
    title="LexSmart Kazakhstan API",
    version="0.1.0",
    description="Labor contract generation & compliance validation for IE/LLP",
)

# АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ТАБЛИЦ ПРИ ЗАПУСКЕ
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # Эта команда создаст таблицу 'users' и другие, если их нет в базе
        await conn.run_sync(Base.metadata.create_all)

# НАСТРОЙКА CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем запросы со всех доменов (Netlify, localhost и т.д.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# РОУТЫ
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(contracts.router, prefix="/api/v1/contracts", tags=["contracts"])

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}