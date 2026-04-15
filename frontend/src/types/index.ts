export interface User {
  id: string;
  email: string;
  full_name: string;
  org_type: "IP" | "TOO";
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ContractCreate {
  org_type: "IP" | "TOO";
  employer_name: string;
  employer_iin_bin: string;
  employer_address: string;
  employee_name: string;
  employee_iin: string;
  employee_address: string;
  position: string;
  salary: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  probation_months: number;
  work_schedule: string;
  vacation_days: number;
  custom_clauses: string;
}

export interface ContractSummary {
  id: string;
  org_type: string;
  employee_name: string;
  position: string;
  created_at: string;
}

export interface ContractListResponse {
  contracts: ContractSummary[];
}

export interface ValidationWarning {
  article: string;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface ValidationResult {
  is_compliant: boolean;
  warnings: ValidationWarning[];
  recommendations: string[];
}
