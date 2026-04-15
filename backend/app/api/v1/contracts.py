import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.contract import Contract
from app.schemas.contract import (
    ContractCreate,
    ContractListResponse,
    ContractResponse,
    ValidationResult,
)
from app.core.security import get_current_user_id
from app.services.docgen import generate_contract_docx
from app.services.rag_engine import validate_contract

router = APIRouter()


@router.post("/generate")
async def generate(
    data: ContractCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    # Save metadata
    contract = Contract(
        user_id=user_id,
        org_type=data.org_type,
        employee_name=data.employee_name,
        position=data.position,
        metadata_json=data.model_dump(mode="json"),
    )
    db.add(contract)
    await db.commit()

    # Generate .docx in memory
    doc_buffer = generate_contract_docx(data)

    filename = f"contract_{data.org_type.lower()}_{data.employee_name.replace(' ', '_')}.docx"
    encoded_filename = urllib.parse.quote(filename, safe="")
    return StreamingResponse(
        doc_buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"},
    )


@router.post("/validate", response_model=ValidationResult)
async def validate(
    data: ContractCreate,
    user_id: str = Depends(get_current_user_id),
) -> ValidationResult:
    result = await validate_contract(data)
    return result


@router.get("", response_model=ContractListResponse)
async def list_contracts(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Contract).where(Contract.user_id == user_id).order_by(Contract.created_at.desc())
    )
    contracts = result.scalars().all()
    return {"contracts": [
        ContractResponse(
            id=c.id,
            org_type=c.org_type,
            employee_name=c.employee_name,
            position=c.position,
            created_at=c.created_at.isoformat(),
        )
        for c in contracts
    ]}
