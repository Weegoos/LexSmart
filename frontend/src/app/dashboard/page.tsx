"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { listContracts } from "@/lib/api";
import Header from "@/components/Header";
import type { ContractSummary } from "@/types";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    listContracts()
      .then((res) => setContracts(res.contracts))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Менің шарттарым</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {fetching ? "" : `${contracts.length} ${plural(contracts.length, "шарт")}`}
            </p>
          </div>
            <Link
            href="/contract/new"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Жаңа шарт
          </Link>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="font-medium text-slate-700">Әзірге шарттар жоқ</p>
            <p className="mt-1 text-sm text-slate-500">Бірінші еңбек шартыңызды құрыңыз</p>
            <Link
              href="/contract/new"
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Шарт жасау
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Жұмысшы</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Лауазым</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Түрі</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Күні</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{c.employee_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{c.position}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                        c.org_type === "IP"
                          ? "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-700/20"
                          : "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/20"
                      }`}>
                        {c.org_type === "IP" ? "ЖК" : "ЗТ"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(c.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function plural(n: number, one: string): string {
  // Қазақ тілінде сан есімнен кейін зат есім жекеше түрде қалады:
  // 1 шарт, 2 шарт, 5 шарт — бәрі бірдей
  void n;
  return one;
}
