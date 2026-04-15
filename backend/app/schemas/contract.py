from datetime import date

from pydantic import BaseModel, Field


class ContractCreate(BaseModel):
    org_type: str = Field(pattern=r"^(IP|TOO)$", description="IP (ИП) or TOO (ТОО)")

    # Employer
    employer_name: str = Field(min_length=1, max_length=500)
    employer_iin_bin: str = Field(min_length=12, max_length=12, description="IIN (12 digits) or BIN")
    employer_address: str = Field(min_length=1, max_length=500)

    # Employee
    employee_name: str = Field(min_length=1, max_length=255)
    employee_iin: str = Field(min_length=12, max_length=12)
    employee_address: str = Field(min_length=1, max_length=500)
    position: str = Field(min_length=1, max_length=255)

    # Terms
    salary: float = Field(gt=0)
    currency: str = Field(default="KZT", max_length=3)
    start_date: date
    end_date: date | None = None
    probation_months: int = Field(default=0, ge=0, le=3)
    work_schedule: str = Field(default="5/2", max_length=50)
    vacation_days: int = Field(default=24, ge=24)

    # Optional custom clauses (for RAG validation)
    custom_clauses: str = Field(default="", max_length=5000)


class ContractResponse(BaseModel):
    id: str
    org_type: str
    employee_name: str
    position: str
    created_at: str

    model_config = {"from_attributes": True}


class ContractListResponse(BaseModel):
    contracts: list[ContractResponse]


class ValidationWarning(BaseModel):
    article: str = Field(description="Relevant Labor Code article")
    severity: str = Field(description="high / medium / low")
    message: str


class ValidationResult(BaseModel):
    is_compliant: bool
    warnings: list[ValidationWarning]
    recommendations: list[str]
