from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, users, contracts

app = FastAPI(
    title="LexSmart Kazakhstan API",
    version="0.1.0",
    description="Labor contract generation & compliance validation for IE/LLP",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://legislative.netlify.app",
        "https://fanciful-profiterole-936b4e.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(contracts.router, prefix="/api/v1/contracts", tags=["contracts"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
