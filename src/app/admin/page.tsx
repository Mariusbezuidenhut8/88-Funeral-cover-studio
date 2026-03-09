"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, FileText, Clock, TrendingUp } from "lucide-react";
import { Application, ApplicationStatus } from "@/types/application.types";
import { Client } from "@/types/client.types";
import { formatDate } from "@/lib/utils/dates";

const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  lapsed: "bg-orange-100 text-orange-700",
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_CLASSES[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ label, value, icon, color }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`${color} p-3 rounded-lg`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [clientsRes, appsRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/applications"),
        ]);
        const [clientsData, appsData] = await Promise.all([
          clientsRes.json(),
          appsRes.json(),
        ]);
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setApplications(Array.isArray(appsData) ? appsData : []);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const now = new Date();
  const thisMonth = applications.filter((a) => {
    const d = new Date(a.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const submitted = applications.filter(
    (a) => a.status === "submitted" || a.status === "pending_review"
  );

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  function getClientName(app: Application): string {
    if (app.factFindData?.client) {
      return `${app.factFindData.client.firstName} ${app.factFindData.client.lastName}`;
    }
    const c = clients.find((cl) => cl.id === app.clientId);
    return c ? `${c.firstName} ${c.lastName}` : "Unknown";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Overview of Funeral Cover Studio activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Clients"
          value={clients.length}
          icon={<Users size={20} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <KpiCard
          label="Total Applications"
          value={applications.length}
          icon={<FileText size={20} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <KpiCard
          label="Pending Review"
          value={submitted.length}
          icon={<Clock size={20} className="text-yellow-600" />}
          color="bg-yellow-50"
        />
        <KpiCard
          label="This Month"
          value={thisMonth.length}
          icon={<TrendingUp size={20} className="text-green-600" />}
          color="bg-green-50"
        />
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Applications</h3>
          <Link
            href="/admin/applications"
            className="text-sm text-green-700 hover:text-green-900 font-medium"
          >
            View all
          </Link>
        </div>

        {recentApps.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            No applications yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="font-mono text-green-700 hover:text-green-900 font-medium text-xs"
                      >
                        {app.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{getClientName(app)}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {app.productName ||
                        app.productSelectionData?.selectedProductName ||
                        "—"}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {formatDate(app.createdAt)}
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
