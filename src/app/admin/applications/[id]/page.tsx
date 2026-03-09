"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, ChevronDown, ChevronUp } from "lucide-react";
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

const STATUS_OPTIONS: ApplicationStatus[] = [
  "draft",
  "submitted",
  "pending_review",
  "approved",
  "declined",
  "lapsed",
];

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_CLASSES[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function formatZAR(amount: number | undefined): string {
  if (amount == null) return "—";
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

interface AccordionProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Accordion({ title, badge, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
          {badge && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={16} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 shrink-0" />
        )}
      </button>
      {open && <div className="px-6 py-4 bg-white border-t border-gray-100">{children}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-1.5">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-48 shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-800 mt-0.5 sm:mt-0">{value ?? "—"}</span>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/applications/${id}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setApplication(data);
      } catch (err) {
        console.error("Application detail load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function updateStatus(newStatus: ApplicationStatus) {
    if (!application) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setApplication(updated);
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Loading application…</div>
      </div>
    );
  }

  if (notFound || !application) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 font-medium">Application not found</p>
        <button
          onClick={() => router.push("/admin/applications")}
          className="mt-4 text-green-700 text-sm hover:underline"
        >
          Back to applications
        </button>
      </div>
    );
  }

  const client = application.factFindData?.client;
  const clientName = client
    ? `${client.firstName} ${client.lastName}`
    : "Unknown";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.push("/admin/applications")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={15} />
        Back to Applications
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-gray-900 font-mono">
              {application.referenceNumber}
            </h2>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-sm text-gray-500">{clientName}</p>
          <p className="text-xs text-gray-400 mt-1">
            Created {formatDateTime(application.createdAt)}
            {application.submittedAt &&
              ` · Submitted ${formatDateTime(application.submittedAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Download ROA */}
          <a
            href={`/api/documents/${application.id}/roa`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-green-700 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-50 transition-colors"
          >
            <Download size={15} />
            Download ROA
          </a>
        </div>
      </div>

      {/* Status Update */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-700">Update Status</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Change the application status (admin override)
          </p>
        </div>
        <select
          value={application.status}
          onChange={(e) => updateStatus(e.target.value as ApplicationStatus)}
          disabled={statusUpdating}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 cursor-pointer"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </option>
          ))}
        </select>
        {statusUpdating && (
          <span className="text-xs text-gray-400 animate-pulse">Saving…</span>
        )}
      </div>

      {/* Accordion Sections */}
      <div className="space-y-3">
        {/* Step 1: Calculator */}
        <Accordion
          title="Step 1 — Calculator"
          badge={application.calculatorData ? "Completed" : undefined}
        >
          {application.calculatorData ? (
            <div className="space-y-1">
              <Row
                label="Completed At"
                value={formatDateTime(application.calculatorData.completedAt)}
              />
              {application.calculatorData.costBreakdown && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Cost Breakdown
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-gray-100 rounded-lg">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-4 py-2 text-left font-semibold text-gray-500">Item</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(application.calculatorData.costBreakdown).map(
                          ([key, val]) => (
                            <tr key={key} className="border-b border-gray-50">
                              <td className="px-4 py-2 text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-800 font-medium">
                                {typeof val === "number"
                                  ? formatZAR(val)
                                  : String(val)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not completed.</p>
          )}
        </Accordion>

        {/* Step 2: Fact Find */}
        <Accordion
          title="Step 2 — Fact Find (Client Details)"
          badge={application.factFindData ? "Completed" : undefined}
        >
          {application.factFindData?.client ? (
            <div className="space-y-1">
              <Row
                label="Full Name"
                value={`${application.factFindData.client.firstName} ${application.factFindData.client.lastName}`}
              />
              <Row
                label="ID Number"
                value={
                  application.factFindData.client.idNumber
                    ? `******${application.factFindData.client.idNumber.slice(-4)}`
                    : undefined
                }
              />
              <Row
                label="Date of Birth"
                value={
                  application.factFindData.client.dateOfBirth
                    ? formatDate(application.factFindData.client.dateOfBirth)
                    : undefined
                }
              />
              <Row label="Age" value={application.factFindData.client.age} />
              <Row label="Gender" value={application.factFindData.client.gender} />
              <Row label="Mobile" value={application.factFindData.client.mobile} />
              <Row label="Email" value={application.factFindData.client.email} />
              <Row
                label="Employment"
                value={application.factFindData.client.employmentStatus}
              />
              <Row
                label="Monthly Income"
                value={formatZAR(application.factFindData.client.monthlyIncome)}
              />
              <Row
                label="Completed At"
                value={formatDateTime(application.factFindData.completedAt)}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not completed.</p>
          )}
        </Accordion>

        {/* Step 3: Needs Analysis */}
        <Accordion
          title="Step 3 — Needs Analysis"
          badge={application.needsAnalysisData ? "Completed" : undefined}
        >
          {application.needsAnalysisData ? (
            <div className="space-y-1">
              <Row
                label="Total Funeral Cost"
                value={formatZAR(application.needsAnalysisData.totalFuneralCost)}
              />
              <Row
                label="Existing Cover"
                value={formatZAR(application.needsAnalysisData.existingCoverTotal)}
              />
              <Row
                label="Cash Savings"
                value={formatZAR(application.needsAnalysisData.cashSavings)}
              />
              <Row
                label="Cover Shortfall"
                value={formatZAR(application.needsAnalysisData.coverShortfall)}
              />
              <Row
                label="Recommended Cover"
                value={formatZAR(application.needsAnalysisData.recommendedCover)}
              />
              <Row
                label="Affordability Ratio"
                value={`${(application.needsAnalysisData.affordabilityRatio * 100).toFixed(1)}% of income`}
              />
              {application.needsAnalysisData.adviserNotes && (
                <Row
                  label="Adviser Notes"
                  value={application.needsAnalysisData.adviserNotes}
                />
              )}
              <Row
                label="Completed At"
                value={formatDateTime(application.needsAnalysisData.completedAt)}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not completed.</p>
          )}
        </Accordion>

        {/* Step 4: Product Selection */}
        <Accordion
          title="Step 4 — Product Selection"
          badge={application.productSelectionData ? "Completed" : undefined}
        >
          {application.productSelectionData ? (
            <div className="space-y-1">
              <Row
                label="Selected Product"
                value={application.productSelectionData.selectedProductName}
              />
              <Row
                label="Product ID"
                value={application.productSelectionData.selectedProductId}
              />
              {application.productSelectionData.selectionReason && (
                <Row
                  label="Reason"
                  value={application.productSelectionData.selectionReason}
                />
              )}
              <Row
                label="Completed At"
                value={formatDateTime(application.productSelectionData.completedAt)}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not completed.</p>
          )}
        </Accordion>

        {/* Step 5: Configuration */}
        <Accordion
          title="Step 5 — Cover Configuration"
          badge={application.configurationData ? "Completed" : undefined}
        >
          {application.configurationData ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Row
                  label="Sum Assured"
                  value={formatZAR(application.configurationData.sumAssured)}
                />
                <Row
                  label="Monthly Premium"
                  value={formatZAR(application.configurationData.monthlyPremium)}
                />
                <Row
                  label="Admin Fee"
                  value={formatZAR(application.configurationData.premiumBreakdown?.adminFee)}
                />
              </div>

              {application.configurationData.members &&
                application.configurationData.members.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Members ({application.configurationData.members.length})
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-gray-100 rounded-lg">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-3 py-2 text-left font-semibold text-gray-500">Name</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500">
                              Relationship
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500">Age</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-500">
                              Premium
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {application.configurationData.members.map((member, i) => {
                            const mp =
                              application.configurationData!.premiumBreakdown?.memberPremiums?.find(
                                (mp) => mp.memberId === member.id
                              );
                            return (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="px-3 py-2 text-gray-700">
                                  {member.firstName} {member.lastName}
                                </td>
                                <td className="px-3 py-2 text-gray-500 capitalize">
                                  {member.type || "main"}
                                </td>
                                <td className="px-3 py-2 text-gray-500">{member.age ?? "—"}</td>
                                <td className="px-3 py-2 text-right text-gray-700 font-medium">
                                  {formatZAR(mp?.premium)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              <Row
                label="Completed At"
                value={formatDateTime(application.configurationData.completedAt)}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not completed.</p>
          )}
        </Accordion>

        {/* Step 6: Disclosures */}
        <Accordion
          title="Step 6 — Disclosures"
          badge={application.disclosureData ? "Completed" : undefined}
        >
          {application.disclosureData ? (
            <div className="space-y-1">
              <Row
                label="Acceptances"
                value={String(application.disclosureData.acceptances?.length || 0)}
              />
              <Row
                label="Completed At"
                value={formatDateTime(application.disclosureData.completedAt)}
              />
              {application.disclosureData.acceptances &&
                application.disclosureData.acceptances.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Individual Acceptances
                    </p>
                    {application.disclosureData.acceptances.map((acc, i) => (
                      <div
                        key={i}
                        className="flex gap-3 text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-green-600 font-bold">✓</span>
                        <span className="font-mono text-gray-500">{acc.disclosureId}</span>
                        <span className="text-gray-400">
                          {formatDateTime(acc.acceptedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not completed.</p>
          )}
        </Accordion>

        {/* Step 7: Record of Advice */}
        <Accordion
          title="Step 7 — Record of Advice"
          badge={application.roaData ? "Completed" : undefined}
        >
          {application.roaData ? (
            <div className="space-y-1">
              <Row
                label="Adviser Confirmed"
                value={application.roaData.adviserConfirmed ? "Yes" : "No"}
              />
              <Row
                label="Motivation"
                value={application.roaData.recommendationMotivation}
              />
              {application.roaData.productsConsidered &&
                application.roaData.productsConsidered.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Products Considered
                    </p>
                    {application.roaData.productsConsidered.map((p, i) => (
                      <div key={i} className="py-1 border-b border-gray-50 last:border-0">
                        <span className="text-xs font-medium text-gray-700">{p.productName}: </span>
                        <span className="text-xs text-gray-500">{p.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              <Row
                label="Generated At"
                value={formatDateTime(application.roaData.generatedAt)}
              />
              <Row
                label="Completed At"
                value={formatDateTime(application.roaData.completedAt)}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not completed.</p>
          )}
        </Accordion>

        {/* Step 8: Acceptance */}
        <Accordion
          title="Step 8 — Acceptance & Signatures"
          badge={application.acceptanceData ? "Completed" : undefined}
        >
          {application.acceptanceData ? (
            <div className="space-y-1">
              <Row
                label="Client Signed At"
                value={formatDateTime(application.acceptanceData.clientSignedAt)}
              />
              <Row
                label="Adviser Signed At"
                value={formatDateTime(application.acceptanceData.adviserSignedAt)}
              />
              <Row
                label="Completed At"
                value={formatDateTime(application.acceptanceData.completedAt)}
              />
              {application.acceptanceData.declarationText && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 leading-relaxed">
                  {application.acceptanceData.declarationText}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not completed.</p>
          )}
        </Accordion>

        {/* Banking Details */}
        {application.bankingDetails && (
          <Accordion title="Banking Details" badge="Captured">
            <div className="space-y-1">
              <Row label="Bank" value={application.bankingDetails.bankName} />
              <Row
                label="Account Holder"
                value={application.bankingDetails.accountHolder}
              />
              <Row
                label="Account Number"
                value={`****${application.bankingDetails.accountNumber?.slice(-4) || "****"}`}
              />
              <Row
                label="Account Type"
                value={application.bankingDetails.accountType}
              />
              <Row
                label="Branch Code"
                value={application.bankingDetails.branchCode}
              />
              <Row
                label="Debit Order Date"
                value={`${application.bankingDetails.debitOrderDate}${
                  application.bankingDetails.debitOrderDate === 1
                    ? "st"
                    : application.bankingDetails.debitOrderDate === 2
                    ? "nd"
                    : "th"
                } of the month`}
              />
            </div>
          </Accordion>
        )}
      </div>
    </div>
  );
}
