"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, ChevronRight } from "lucide-react";
import { Client } from "@/types/client.types";
import { formatDate } from "@/lib/utils/dates";

function maskId(idNumber: string): string {
  if (!idNumber || idNumber.length < 4) return "******";
  return `******${idNumber.slice(-4)}`;
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/clients");
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Clients load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      c.mobile?.toLowerCase().includes(q) ||
      c.idNumber?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Loading clients…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
          <p className="text-sm text-gray-500 mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Link
          href="/wizard/step/1"
          className="inline-flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
        >
          <UserPlus size={16} />
          New Application
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search by name, mobile or ID number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            {search ? (
              <p className="text-gray-400 text-sm">
                No clients match &ldquo;{search}&rdquo;
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-500 font-medium">No clients yet</p>
                <p className="text-gray-400 text-sm">
                  Start a new application to create the first client record.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left bg-gray-50">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ID Number
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Employment
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date Added
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {client.firstName} {client.lastName}
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-500 text-xs">
                      {maskId(client.idNumber)}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{client.mobile}</td>
                    <td className="px-6 py-3 text-gray-600">{client.age ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-600 capitalize">
                      {client.employmentStatus?.replace("-", " ") || "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {formatDate(client.createdAt)}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 text-xs font-semibold"
                      >
                        View <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
