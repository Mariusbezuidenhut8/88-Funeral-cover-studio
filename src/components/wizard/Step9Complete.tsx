"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileText, PlusCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import { useWizardStore } from "@/lib/store/wizard.store";

export interface StepProps {
  onComplete: () => void;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900 text-right">{value ?? "—"}</span>
    </div>
  );
}

// Generate a human-readable reference number from a uuid-like id
function generateReference(id: string | null): string {
  if (!id) {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FC-${new Date().getFullYear()}-${rand}`;
  }
  const short = id.replace(/-/g, "").substring(0, 8).toUpperCase();
  return `FC-${new Date().getFullYear()}-${short}`;
}

export default function Step9Complete({ onComplete }: StepProps) {
  const router = useRouter();
  const { applicationId, step2, step4, step5, resetWizard } = useWizardStore();

  const referenceNumber = generateReference(applicationId);
  const client = step2?.client;
  const submittedAt = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handleNewApplication() {
    resetWizard();
    router.push("/wizard/step/1");
  }

  const appId = applicationId ?? "pending";
  const roaUrl = `/api/documents/${appId}/roa`;
  const disclosureUrl = `/api/documents/${appId}/disclosure`;

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Success icon */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center shadow-md shadow-green-200">
          <CheckCircle2 className="w-11 h-11 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Application Submitted Successfully!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Your funeral cover application has been received and is being processed.
          </p>
        </div>
      </div>

      {/* Reference number */}
      <div className="w-full max-w-md rounded-2xl border-2 border-green-300 bg-green-50 px-6 py-4 text-center">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-1">
          Reference Number
        </p>
        <p className="text-2xl font-mono font-bold text-green-800 tracking-wider">
          {referenceNumber}
        </p>
        <p className="text-xs text-green-600 mt-2">
          Please save this reference number for your records.
        </p>
      </div>

      {/* Policy summary card */}
      <div className="w-full rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Policy Summary</h3>
        </div>
        <div className="px-4 py-1">
          <SummaryRow
            label="Client"
            value={`${client?.firstName ?? ""} ${client?.lastName ?? ""}`}
          />
          <SummaryRow label="Product" value={step4?.selectedProductName} />
          <SummaryRow
            label="Sum Assured"
            value={formatZAR(step5?.sumAssured ?? 0, { showDecimals: false })}
          />
          <SummaryRow
            label="Monthly Premium"
            value={
              <span className="text-green-700">
                {formatZAR(step5?.monthlyPremium ?? 0)}
              </span>
            }
          />
          <SummaryRow
            label="Family Members Covered"
            value={(step5?.members?.length ?? 0) + 1}
          />
          <SummaryRow label="Application Date" value={submittedAt} />
        </div>
      </div>

      {/* Contact note */}
      <div className="w-full flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">What happens next?</p>
          <p className="text-sm text-blue-700 mt-0.5">
            Your adviser will contact you within{" "}
            <strong>2 business days</strong> to confirm policy inception and provide your
            policy schedule. Please ensure your banking details are correct for the debit
            order to go through.
          </p>
        </div>
      </div>

      {/* Downloads */}
      <div className="w-full flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Download Documents</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={roaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
            aria-disabled={appId === "pending"}
            onClick={(e) => {
              if (appId === "pending") {
                e.preventDefault();
              }
            }}
          >
            <Button
              type="button"
              variant="outline"
              disabled={appId === "pending"}
              className="w-full flex items-center gap-2 justify-center"
            >
              <FileText className="w-4 h-4" />
              {appId === "pending" ? "Record of Advice (Coming soon)" : "Download Record of Advice"}
            </Button>
          </a>
          <a
            href={disclosureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
            aria-disabled={appId === "pending"}
            onClick={(e) => {
              if (appId === "pending") {
                e.preventDefault();
              }
            }}
          >
            <Button
              type="button"
              variant="outline"
              disabled={appId === "pending"}
              className="w-full flex items-center gap-2 justify-center"
            >
              <Download className="w-4 h-4" />
              {appId === "pending" ? "Disclosures (Coming soon)" : "Download Disclosures"}
            </Button>
          </a>
        </div>
        {appId === "pending" && (
          <p className="text-xs text-gray-400">
            Documents will be available once the application ID is generated by the server.
          </p>
        )}
      </div>

      {/* New application */}
      <Button
        type="button"
        onClick={handleNewApplication}
        variant="outline"
        className="flex items-center gap-2 text-gray-700 border-gray-300 hover:bg-gray-50"
      >
        <PlusCircle className="w-4 h-4" />
        Start New Application
      </Button>
    </div>
  );
}
