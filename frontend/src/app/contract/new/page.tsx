"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { validateContract, generateContract } from "@/lib/api";
import Header from "@/components/Header";
import type { ContractCreate, ValidationResult } from "@/types";

const EMPTY_FORM: ContractCreate = {
  org_type: "IP",
  employer_name: "",
  employer_iin_bin: "",
  employer_address: "",
  employee_name: "",
  employee_iin: "",
  employee_address: "",
  position: "",
  salary: 0,
  currency: "KZT",
  start_date: new Date().toISOString().split("T")[0],
  end_date: null,
  probation_months: 0,
  work_schedule: "5/2",
  vacation_days: 24,
  custom_clauses: "",
};

export default function NewContractPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ContractCreate>(EMPTY_FORM);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [step, setStep] = useState<"form" | "validation" | "done">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  function update<K extends keyof ContractCreate>(key: K, value: ContractCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleValidate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await validateContract(form);
      setValidation(result);
      setStep("validation");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Тексеру қатесі");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerate() {
    setError("");
    setSubmitting(true);
    try {
      const blob = await generateContract(form);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contract_${form.org_type.toLowerCase()}_${form.employee_name.replace(/\s/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Жасау қатесі");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Жаңа еңбек шарты</h1>
          <p className="mt-1 text-sm text-slate-500">Мәліметтерді толтырыңыз — жүйе ҚР Еңбек кодексіне сәйкестігін тексереді</p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleValidate} className="space-y-5">
            {/* Org type */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-slate-700">Ұйым түрі</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["IP", "TOO"] as const).map((t) => (
                  <label
                    key={t}
                    className={`flex cursor-pointer items-center justify-center rounded-xl border py-3 text-sm font-medium transition-all ${
                      form.org_type === t
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="org_type"
                      value={t}
                      checked={form.org_type === t}
                      onChange={() => update("org_type", t)}
                      className="sr-only"
                    />
                   {t === "IP" ? "ЖК" : "ЗТ"}
                  </label>
                ))}
              </div>
            </div>

            {/* Employer */}
            <Section title="Жұмыс беруші">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Атауы" value={form.employer_name} onChange={(v) => update("employer_name", v)} required placeholder="ЖК Ахметов немесе «Компания» ЗТ" />
                <Field label="ЖСН / БСН" value={form.employer_iin_bin} onChange={(v) => update("employer_iin_bin", v)} required maxLength={12} minLength={12} placeholder="12 таңба" />
              </div>
              <Field label="Заңды мекенжайы" value={form.employer_address} onChange={(v) => update("employer_address", v)} required placeholder="Қ. Алматы, Абай к., 1" />
            </Section>

            {/* Employee */}
            <Section title="Жұмысшы">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Тегі, аты, әкесінің аты" value={form.employee_name} onChange={(v) => update("employee_name", v)} required placeholder="Ахметов Серік Болатұлы" />
                <Field label="ЖСН" value={form.employee_iin} onChange={(v) => update("employee_iin", v)} required maxLength={12} minLength={12} placeholder="12 таңба" />
              </div>
              <Field label="Тұратын мекенжайы" value={form.employee_address} onChange={(v) => update("employee_address", v)} required placeholder="Қ. Алматы, Ленин к., 5" />
              <Field label="Лауазым" value={form.position} onChange={(v) => update("position", v)} required placeholder="Мысалы: Бағдарламашы-инженер" />
            </Section>

            {/* Terms */}
            <Section title="Шарт талаптары">
              <div className="grid gap-4 sm:grid-cols-3">
                <NumberField
                  label="Жалақы (KZT)"
                  value={form.salary}
                  onChange={(v) => update("salary", v)}
                  min={1}
                  required
                  placeholder="300 000"
                />
                <DateField
                  label="Басталу күні"
                  value={form.start_date}
                  onChange={(v) => update("start_date", v)}
                  required
                />
                <DateField
                  label="Аяқталу күні"
                  value={form.end_date || ""}
                  onChange={(v) => update("end_date", v || null)}
                  hint="Мерзімсіз болса бос қалдырыңыз"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <NumberField
                  label="Сынақ мерзімі (ай)"
                  value={form.probation_months}
                  onChange={(v) => update("probation_months", v)}
                  min={0}
                  max={3}
                  hint="0 — сынақсыз"
                />
                <Field
                  label="Жұмыс режимі"
                  value={form.work_schedule}
                  onChange={(v) => update("work_schedule", v)}
                  placeholder="5/2, 6/1, ауыспалы..."
                />
                <NumberField
                  label="Демалыс күндері"
                  value={form.vacation_days}
                  onChange={(v) => update("vacation_days", v)}
                  min={24}
                  hint="Қазақстанның ЕК бойынша минимум 24 күн"
                />
              </div>
            </Section>

            {/* Custom clauses */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Қосымша шарттар
                <span className="ml-1.5 font-normal text-slate-400">(міндетті емес)</span>
              </label>
              <textarea
                rows={3}
                maxLength={5000}
                value={form.custom_clauses}
                onChange={(e) => update("custom_clauses", e.target.value)}
                placeholder="Қазақстанның Еңбек кодексіне сәйкестігін тексеру үшін ерекше шарттарды енгізіңіз..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Тексеріліп жатыр...
                </span>
              ) : (
                "Қазақстан ЕК-ке сәйкестігін тексеру"
              )}
            </button>
          </form>
        )}

        {step === "validation" && validation && (
          <div className="space-y-4">
            {/* Compliance banner */}
            <div className={`flex items-center gap-3 rounded-2xl border p-4 ${
              validation.is_compliant
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}>
              {validation.is_compliant ? (
                <svg className="h-5 w-5 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 shrink-0 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              )}
              <div>
                <p className={`font-semibold ${validation.is_compliant ? "text-emerald-800" : "text-amber-800"}`}>
                  {validation.is_compliant ? "Шарт Қазақстан ЕК-не сәйкес" : "Ескертпелер табылды"}
                </p>
                {!validation.is_compliant && (
                  <p className="text-sm text-amber-700">Жүктеп алмас бұрын төмендегі ескертпелермен танысыңыз</p>
                )}
              </div>
            </div>

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Ескертпелер</h3>
                <div className="space-y-2.5">
                  {validation.warnings.map((w, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-3.5 ${
                        w.severity === "high"
                          ? "border-red-100 bg-red-50"
                          : w.severity === "medium"
                          ? "border-amber-100 bg-amber-50"
                          : "border-blue-100 bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-600">{w.article}</span>
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold uppercase ${
                          w.severity === "high"
                            ? "bg-red-100 text-red-700"
                            : w.severity === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {w.severity === "high" ? "Жоғары" : w.severity === "medium" ? "Орташа" : "Төмен"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{w.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {validation.recommendations.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Ұсынымдар</h3>
                <ul className="space-y-2">
                  {validation.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                      </svg>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep("form")}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Форманы қайта өңдеу
              </button>
              <button
                onClick={handleGenerate}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Жасалуда...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                    </svg>
                    .docx жүктеу
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 py-16 text-center shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-lg font-bold text-emerald-800">Шарт дайындалды!</p>
            <p className="mt-1 text-sm text-emerald-600">.docx файлы құрылғыңызға жүктелді</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setForm(EMPTY_FORM); setValidation(null); setStep("form"); }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Тағы құру
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Шарттар тізіміне
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// --- Field components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-700">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label, value, onChange, required, maxLength, minLength, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; maxLength?: number; minLength?: number; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type="text"
        required={required}
        maxLength={maxLength}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function NumberField({
  label, value, onChange, min, max, required, placeholder, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; required?: boolean; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type="number"
        required={required}
        min={min}
        max={max}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function DateField({
  label, value, onChange, required, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type="date"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
