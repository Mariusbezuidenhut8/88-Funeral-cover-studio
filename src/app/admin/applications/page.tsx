"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Filter } from "lucide-react";
import { Application, ApplicationStatus } from "@/types/application.types";
import { formatDate } from "@/lib/utils/dates";

const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  lapsed: "bg-orange-100 text-orange-700",
};

const ALL_STATUSES: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "lapsed", label: "Lapsed" },
];

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_CLASSES[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/applications");
        const data = await res.json();
        setApplications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Applications load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    statusFilter === "all"
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Loading applications…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Applications</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} of {applications.length} application
            {applications.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-gray-400 shrink-0" />
        {ALL_STATUSES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={[
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
              statusFilter === value
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700",
            ].join(" ")}
          >
            {label}
            {value !== "all" && (
              <span className="ml-1.5 opacity-70">
                ({applications.filter((a) => a.status === value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-400 text-sm">
              {statusFilter === "all"
                ? "No applications yet."
                : `No ${statusFilter.replace("_", " ")} applications.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left bg-gray-50">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sum Assured
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Monthly Premium
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((app) => {
                  const clientName = app.factFindData?.client
                    ? `${app.factFindData.client.firstName} ${app.factFindData.client.lastName}`
                    : "Unknown";
                  const sumAssured =
                    app.selectedCover ??
                    app.configurationData?.sumAssured;
                  const premium =
                    app.monthlyPremium ??
                    app.configurationData?.monthlyPremium;

                  return (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="font-mono text-xs text-green-700 hover:text-green-900 font-semibold"
                        >
                          {app.referenceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-700">{clientName}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {app.productName ||
                          app.productSelectionData?.selectedProductName ||
                          "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {sumAssured != null
                          ? `R ${sumAssured.toLocaleString("en-ZA")}`
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {premium != null
                          ? `R ${premium.toLocaleString("en-ZA")}/mo`
                          : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {formatDate(app.createdAt)}
                      </td>
                      <td className="px-6 py-3">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 text-xs font-semibold"
                        >
                          View <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
