import type {
  User,
  TokenResponse,
  ContractCreate,
  ContractListResponse,
  ValidationResult,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// --- Auth ---

export async function register(
  email: string,
  password: string,
  full_name: string,
  org_type: string
): Promise<User> {
  return request<User>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name, org_type }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<TokenResponse> {
  return request<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<User> {
  return request<User>("/api/v1/users/me");
}

// --- Contracts ---

export async function listContracts(): Promise<ContractListResponse> {
  return request<ContractListResponse>("/api/v1/contracts");
}

export async function validateContract(
  data: ContractCreate
): Promise<ValidationResult> {
  return request<ValidationResult>("/api/v1/contracts/validate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generateContract(data: ContractCreate): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/v1/contracts/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Failed to generate contract");
  }

  return res.blob();
}
