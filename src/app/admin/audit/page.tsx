"use client";

import { useEffect, useState } from "react";
import { Search, ClipboardList } from "lucide-react";
import { AuditEvent, AuditAction } from "@/types/audit.types";
import { formatDateTime } from "@/lib/utils/dates";

const ACTION_COLORS: Partial<Record<AuditAction, string>> = {
  CLIENT_CREATED: "bg-blue-100 text-blue-700",
  APPLICATION_STARTED: "bg-indigo-100 text-indigo-700",
  APPLICATION_SUBMITTED: "bg-green-100 text-green-700",
  STEP_COMPLETED: "bg-teal-100 text-teal-700",
  STEP_BACK: "bg-gray-100 text-gray-600",
  CALCULATOR_RUN: "bg-yellow-100 text-yellow-700",
  PRODUCT_SELECTED: "bg-purple-100 text-purple-700",
  DISCLOSURE_VIEWED: "bg-orange-100 text-orange-700",
  DISCLOSURE_ACCEPTED: "bg-orange-100 text-orange-700",
  ROA_GENERATED: "bg-cyan-100 text-cyan-700",
  SIGNATURE_CAPTURED: "bg-pink-100 text-pink-700",
  DOCUMENT_DOWNLOADED: "bg-lime-100 text-lime-700",
  ADMIN_LOGIN: "bg-red-100 text-red-700",
  ADMIN_VIEWED_CLIENT: "bg-slate-100 text-slate-700",
  ADMIN_VIEWED_APPLICATION: "bg-slate-100 text-slate-700",
  PRODUCT_UPDATED: "bg-amber-100 text-amber-700",
};

const ALL_ACTIONS: AuditAction[] = [
  "CLIENT_CREATED",
  "APPLICATION_STARTED",
  "APPLICATION_SUBMITTED",
  "STEP_COMPLETED",
  "STEP_BACK",
  "CALCULATOR_RUN",
  "PRODUCT_SELECTED",
  "DISCLOSURE_VIEWED",
  "DISCLOSURE_ACCEPTED",
  "ROA_GENERATED",
  "SIGNATURE_CAPTURED",
  "DOCUMENT_DOWNLOADED",
  "ADMIN_LOGIN",
  "ADMIN_VIEWED_CLIENT",
  "ADMIN_VIEWED_APPLICATION",
  "PRODUCT_UPDATED",
];

function ActionBadge({ action }: { action: AuditAction }) {
  const cls = ACTION_COLORS[action] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {action.replace(/_/g, " ")}
    </span>
  );
}

export default function AuditTrailPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/audit");
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Audit load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = events.filter((e) => {
    // Action filter
    if (actionFilter !== "all" && e.action !== actionFilter) return false;

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (new Date(e.timestamp) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(e.timestamp) > to) return false;
    }

    // Text search
    if (search) {
      const q = search.toLowerCase();
      return (
        e.adviserName?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.applicationId?.toLowerCase().includes(q) ||
        e.clientId?.toLowerCase().includes(q) ||
        e.action?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Loading audit trail…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Audit Trail</h2>
        <p className="text-sm text-gray-500 mt-1">
          {filtered.length} of {events.length} events — read only, newest first
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search adviser, description, application ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
        </div>

        {/* Action + Date filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={actionFilter}
            onChange={(e) =>
              setActionFilter(e.target.value as AuditAction | "all")
            }
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 flex-1"
          >
            <option value="all">All Actions</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-gray-500 shrink-0">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 flex-1"
            />
          </div>

          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-gray-500 shrink-0">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 flex-1"
            />
          </div>

          {(search || actionFilter !== "all" || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearch("");
                setActionFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors shrink-0"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {events.length === 0
                ? "No audit events recorded yet."
                : "No events match the current filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left bg-gray-50">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Adviser
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Client / Application
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Step
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap font-mono">
                      {formatDateTime(event.timestamp)}
                    </td>
                    <td className="px-6 py-3 text-gray-700 text-xs whitespace-nowrap">
                      <span className="font-medium">{event.adviserName}</span>
                      {event.adviserId !== event.adviserName && (
                        <span className="block text-gray-400 font-mono text-xs">
                          {event.adviserId}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <ActionBadge action={event.action} />
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs max-w-xs">
                      {event.description}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {event.applicationId && (
                        <span className="block font-mono text-indigo-600 truncate max-w-[140px]">
                          App: {event.applicationId}
                        </span>
                      )}
                      {event.clientId && (
                        <span className="block font-mono text-blue-500 truncate max-w-[140px]">
                          Client: {event.clientId}
                        </span>
                      )}
                      {!event.applicationId && !event.clientId && (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-xs">
                      {event.stepNumber != null ? `Step ${event.stepNumber}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length >= 500 && (
        <p className="text-xs text-gray-400 text-center">
          Showing the most recent 500 events. Use filters to narrow results.
        </p>
      )}
    </div>
  );
}
