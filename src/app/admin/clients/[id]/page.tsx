"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ChevronRight, UserPlus } from "lucide-react";
import { Client } from "@/types/client.types";
import { Application, ApplicationStatus } from "@/types/application.types";
import { formatDate, formatDateTime } from "@/lib/utils/dates";

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

function DetailRow({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-44 shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-800 mt-0.5 sm:mt-0">{value ?? "—"}</span>
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [clientRes, appsRes] = await Promise.all([
          fetch(`/api/clients/${id}`),
          fetch(`/api/applications?clientId=${id}`),
        ]);

        if (!clientRes.ok) {
          setNotFound(true);
          return;
        }

        const [clientData, appsData] = await Promise.all([
          clientRes.json(),
          appsRes.json(),
        ]);

        setClient(clientData);
        setApplications(Array.isArray(appsData) ? appsData : []);
      } catch (err) {
        console.error("Client detail load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Loading client…</div>
      </div>
    );
  }

  if (notFound || !client) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 font-medium">Client not found</p>
        <button
          onClick={() => router.push("/admin/clients")}
          className="mt-4 text-green-700 text-sm hover:underline"
        >
          Back to clients
        </button>
      </div>
    );
  }

  const existingCoverTotal = client.existingCover?.reduce(
    (sum, c) => sum + (c.sumAssured || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.push("/admin/clients")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={15} />
        Back to Clients
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {client.firstName} {client.lastName}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Client ID: <span className="font-mono">{client.id}</span>
          </p>
        </div>
        <Link
          href="/wizard/step/1"
          className="inline-flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
        >
          <UserPlus size={15} />
          New Application
        </Link>
      </div>

      {/* Client Details Card */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {/* Personal */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-green-600 rounded-full inline-block" />
            Personal Information
          </h3>
          <DetailRow label="First Name" value={client.firstName} />
          <DetailRow label="Last Name" value={client.lastName} />
          <DetailRow
            label="ID Number"
            value={
              client.idNumber
                ? `******${client.idNumber.slice(-4)}`
                : undefined
            }
          />
          <DetailRow
            label="Date of Birth"
            value={client.dateOfBirth ? formatDate(client.dateOfBirth) : undefined}
          />
          <DetailRow label="Age" value={client.age} />
          <DetailRow label="Gender" value={client.gender} />
        </div>

        {/* Contact */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block" />
            Contact Details
          </h3>
          <DetailRow label="Mobile" value={client.mobile} />
          <DetailRow label="Email" value={client.email} />
          <DetailRow
            label="Address"
            value={
              client.address
                ? [
                    client.address.line1,
                    client.address.line2,
                    client.address.suburb,
                    client.address.city,
                    client.address.province,
                    client.address.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : undefined
            }
          />
        </div>

        {/* Financial */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-yellow-500 rounded-full inline-block" />
            Financial Profile
          </h3>
          <DetailRow
            label="Employment"
            value={client.employmentStatus?.replace("-", " ")}
          />
          <DetailRow
            label="Monthly Income"
            value={
              client.monthlyIncome != null
                ? `R ${client.monthlyIncome.toLocaleString("en-ZA")}`
                : undefined
            }
          />
          <DetailRow
            label="Existing Cover Total"
            value={
              existingCoverTotal != null
                ? `R ${existingCoverTotal.toLocaleString("en-ZA")}`
                : undefined
            }
          />
          <DetailRow
            label="Terminal Illness"
            value={client.hasTerminalIllness ? "Yes" : "No"}
          />
        </div>

        {/* Meta */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-gray-400 rounded-full inline-block" />
            Record Information
          </h3>
          <DetailRow
            label="Created"
            value={formatDateTime(client.createdAt)}
          />
          <DetailRow
            label="Last Updated"
            value={formatDateTime(client.updatedAt)}
          />
          <DetailRow label="Adviser ID" value={client.adviserId} />
        </div>
      </div>

      {/* Applications */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={16} className="text-gray-400" />
            Applications ({applications.length})
          </h3>
        </div>

        {applications.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            No applications for this client yet.
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
                    Product
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Premium
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
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-green-700 font-semibold">
                      {app.referenceNumber}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {app.productName ||
                        app.productSelectionData?.selectedProductName ||
                        "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {app.monthlyPremium != null
                        ? `R ${app.monthlyPremium.toLocaleString("en-ZA")}/mo`
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
