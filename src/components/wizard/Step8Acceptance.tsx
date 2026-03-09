"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import SignatureCanvas from "@/components/shared/SignatureCanvas";
import { useWizardStore } from "@/lib/store/wizard.store";
import { BankingDetails } from "@/types/application.types";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

const DECLARATION_TEXT = `DECLARATION BY CLIENT

I, the undersigned, hereby declare that:

1. The information provided in this application for funeral cover is true and correct to the best of my knowledge and belief.

2. I understand that any deliberate misrepresentation or non-disclosure of material facts may result in the cancellation of the policy and/or the rejection of any claim.

3. I acknowledge that I have been afforded sufficient opportunity to read and understand the terms and conditions of the proposed policy, including the waiting periods, exclusions, and premium obligations.

4. I confirm that I have received, read, and understood all FAIS-required disclosures, including the FSP licence disclosure, product disclosure, conflict of interest declaration, cooling-off rights (LTIA Section 59), complaint procedures, and POPIA consent.

5. I consent to the monthly deduction of the agreed premium from my nominated bank account on the selected debit order date.

6. I confirm that I am a South African citizen or permanent resident and am at least 18 years of age.

7. I understand and accept that this Record of Advice, once signed by both myself and the adviser, constitutes a binding application for funeral cover subject to the product provider's acceptance and underwriting requirements.

ADVISER DECLARATION

I, the undersigned financial services representative, hereby declare that:

1. I am an authorised representative in terms of the FAIS Act and the FSP licence of Fairbairn Consult (Pty) Ltd.

2. I have conducted a proper needs analysis and provided advice that is appropriate to the client's circumstances, objectives, and financial situation.

3. I have made all required disclosures in terms of the FAIS General Code of Conduct.

4. A copy of this Record of Advice will be retained for a minimum period of five (5) years.`;

const BANK_OPTIONS = [
  "Absa Bank",
  "African Bank",
  "Capitec Bank",
  "Discovery Bank",
  "FNB (First National Bank)",
  "Investec Bank",
  "Nedbank",
  "Standard Bank",
  "Tyme Bank",
];

const ACCOUNT_TYPES = [
  { value: "cheque", label: "Cheque / Current Account" },
  { value: "savings", label: "Savings Account" },
] as const;

const DEBIT_DATES = [1, 15, 25] as const;

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

const selectClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
      {children}
    </h3>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value ?? "—"}</span>
    </div>
  );
}

export default function Step8Acceptance({ onComplete }: StepProps) {
  const { step2, step4, step5, saveStep8 } = useWizardStore();

  const client = step2?.client;

  const [clientSig, setClientSig] = useState("");
  const [clientSigAt, setClientSigAt] = useState("");
  const [adviserSig, setAdviserSig] = useState("");
  const [adviserSigAt, setAdviserSigAt] = useState("");

  const [banking, setBanking] = useState<Partial<BankingDetails>>({
    bankName: "",
    accountHolder: client ? `${client.firstName} ${client.lastName}` : "",
    accountNumber: "",
    accountType: "cheque",
    branchCode: "",
    debitOrderDate: 1,
  });

  const [errors, setErrors] = useState<string[]>([]);

  function handleClientSig(dataUrl: string) {
    setClientSig(dataUrl);
    setClientSigAt(dataUrl ? new Date().toISOString() : "");
  }

  function handleAdviserSig(dataUrl: string) {
    setAdviserSig(dataUrl);
    setAdviserSigAt(dataUrl ? new Date().toISOString() : "");
  }

  const bankingComplete =
    !!banking.bankName &&
    !!banking.accountHolder?.trim() &&
    !!banking.accountNumber?.trim() &&
    !!banking.accountType &&
    !!banking.branchCode?.trim() &&
    !!banking.debitOrderDate;

  const canSubmit = !!clientSig && !!adviserSig && bankingComplete;

  function handleSubmit() {
    const errs: string[] = [];
    if (!clientSig) errs.push("Client signature is required.");
    if (!adviserSig) errs.push("Adviser signature is required.");
    if (!bankingComplete) errs.push("All banking details are required.");
    setErrors(errs);
    if (errs.length > 0) return;

    const now = new Date().toISOString();
    saveStep8({
      clientSignatureDataUrl: clientSig,
      adviserSignatureDataUrl: adviserSig,
      clientSignedAt: clientSigAt,
      adviserSignedAt: adviserSigAt,
      declarationText: DECLARATION_TEXT,
      completedAt: now,
    });
    toast.success("Application submitted successfully!");
    onComplete();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Sign &amp; Accept
        </h2>
        <p className="text-sm text-gray-500">
          Review the policy summary, read the declaration, provide both signatures, and
          enter banking details to submit the application.
        </p>
      </div>

      {/* Policy summary */}
      <section>
        <SectionTitle>Policy Summary</SectionTitle>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-1">
            <SummaryRow label="Product" value={step4?.selectedProductName} />
            <SummaryRow
              label="Sum Assured"
              value={formatZAR(step5?.sumAssured ?? 0, { showDecimals: false })}
            />
            <SummaryRow
              label="Monthly Premium"
              value={
                <span className="text-green-700 font-bold text-base">
                  {formatZAR(step5?.monthlyPremium ?? 0)}
                </span>
              }
            />
            <SummaryRow
              label="Family Members"
              value={step5?.members?.length ?? 0}
            />
            <SummaryRow
              label="Beneficiaries"
              value={step5?.beneficiaries?.length ?? 0}
            />
            <SummaryRow
              label="Client"
              value={`${client?.firstName ?? ""} ${client?.lastName ?? ""}`}
            />
          </div>
        </div>
      </section>

      {/* Declaration */}
      <section>
        <SectionTitle>Declaration</SectionTitle>
        <div
          className="rounded-xl border border-gray-300 bg-gray-50 p-4 max-h-64 overflow-y-auto
            text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono select-none"
        >
          {DECLARATION_TEXT}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          This declaration is non-editable. Please read carefully before signing.
        </p>
      </section>

      {/* Client Signature */}
      <section>
        <SectionTitle>Client Signature</SectionTitle>
        <SignatureCanvas
          label="Client Signature"
          onSave={handleClientSig}
          height={160}
        />
        {clientSig && (
          <p className="text-xs text-green-600 mt-1">
            Signed at {new Date(clientSigAt).toLocaleTimeString("en-ZA")}
          </p>
        )}
      </section>

      {/* Adviser Signature */}
      <section>
        <SectionTitle>Adviser Signature</SectionTitle>
        <SignatureCanvas
          label="Adviser Signature"
          onSave={handleAdviserSig}
          height={160}
        />
        {adviserSig && (
          <p className="text-xs text-green-600 mt-1">
            Signed at {new Date(adviserSigAt).toLocaleTimeString("en-ZA")}
          </p>
        )}
      </section>

      {/* Banking Details */}
      <section>
        <SectionTitle>Banking Details (Debit Order)</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <select
              value={banking.bankName}
              onChange={(e) =>
                setBanking((p) => ({ ...p, bankName: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">Select bank…</option>
              {BANK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Account Holder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={banking.accountHolder}
              onChange={(e) =>
                setBanking((p) => ({ ...p, accountHolder: e.target.value }))
              }
              placeholder="Full name as on bank account"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Account Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={banking.accountNumber}
              onChange={(e) =>
                setBanking((p) => ({
                  ...p,
                  accountNumber: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="e.g. 1234567890"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Account Type <span className="text-red-500">*</span>
            </label>
            <select
              value={banking.accountType}
              onChange={(e) =>
                setBanking((p) => ({
                  ...p,
                  accountType: e.target.value as "cheque" | "savings",
                }))
              }
              className={selectClass}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Branch Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={banking.branchCode}
              onChange={(e) =>
                setBanking((p) => ({
                  ...p,
                  branchCode: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="e.g. 051001"
              maxLength={6}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Debit Order Date <span className="text-red-500">*</span>
            </label>
            <select
              value={banking.debitOrderDate}
              onChange={(e) =>
                setBanking((p) => ({
                  ...p,
                  debitOrderDate: Number(e.target.value) as 1 | 15 | 25,
                }))
              }
              className={selectClass}
            >
              {DEBIT_DATES.map((d) => (
                <option key={d} value={d}>
                  {d === 1 ? "1st" : d === 15 ? "15th" : "25th"} of each month
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Status checklist */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-2">
        {[
          { label: "Client signature captured", done: !!clientSig },
          { label: "Adviser signature captured", done: !!adviserSig },
          { label: "Banking details complete", done: bankingComplete },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span className={item.done ? "text-green-700" : "text-gray-500"}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-2">
          {errors.map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3"
            >
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{e}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`font-semibold px-8 ${
            canSubmit
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Submit Application
        </Button>
      </div>
    </div>
  );
}
