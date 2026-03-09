"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/lib/store/wizard.store";
import { DisclosureAcceptance } from "@/types/disclosure.types";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

interface DisclosureDefinition {
  id: string;
  title: string;
  category: string;
  content: string;
}

const DISCLOSURES: DisclosureDefinition[] = [
  {
    id: "fsp_license",
    title: "FSP Licence & Authorisation",
    category: "fsp_license",
    content: `Fairbairn Consult (Pty) Ltd is an authorised Financial Services Provider (FSP) in terms of the Financial Advisory and Intermediary Services Act, 37 of 2002 (FAIS Act).

FSP Name: Fairbairn Consult (Pty) Ltd
FSP Number: FSP XXXX
Categories of Authorisation: Category I — Long-Term Insurance (Subcategory A, B1, B2, C); Category I — Short-Term Insurance Personal Lines; Category I — Friendly Society Benefits.

Your adviser is a Key Individual or Representative acting under the above FSP licence. You may verify this licence on the FSCA website at www.fsca.co.za or by calling 0800 110 443.

A copy of the FSP's licence is available on request.`,
  },
  {
    id: "product_disclosure",
    title: "Product Disclosure — Waiting Periods & Exclusions",
    category: "product",
    content: `Before accepting this policy, please note the following material terms:

WAITING PERIODS
• General causes of death: A waiting period of 6 months from inception applies. No benefit is payable if death occurs within this period from a non-accidental cause.
• Accidental death: No waiting period applies. Full benefit is payable immediately.
• Suicide: A 24-month waiting period applies. If death by suicide occurs within 24 months of inception, no benefit is payable.
• New-entry members added mid-term: New waiting periods commence from the date of inclusion of the member.

EXCLUSIONS — no benefit is payable in respect of death caused directly or indirectly by:
• War, civil war, invasion, or acts of a foreign enemy
• Participation in any criminal activity
• Intentional self-inflicted injury
• Any cause arising from pre-existing terminal illness declared and disclosed at inception

These are summarised exclusions. The full policy wording governs in all cases and is available on request.`,
  },
  {
    id: "conflict_of_interest",
    title: "Conflict of Interest Disclosure",
    category: "conflict_of_interest",
    content: `In terms of Section 3A of the General Code of Conduct for Authorised FSPs and Representatives (Board Notice 80 of 2003), we are required to disclose any actual or potential conflicts of interest.

REMUNERATION
Your adviser may receive commission and/or fees in respect of this transaction. Commission is paid by the product provider (insurer) in accordance with the Long-Term Insurance Act, 52 of 1998, and is embedded in the premium. No additional fees are charged to you unless separately agreed in writing.

COMMISSION DISCLOSURE
Typical commission on funeral cover products ranges from 7.5% to 22.5% of the annual premium, depending on the product and distribution agreement.

OTHER INTERESTS
Fairbairn Consult maintains a Conflict of Interest Management Policy, which is available on request. We confirm that no ownership interest, financial interest, or incentive exists that would compromise our obligation to act in your best interests.

You have the right to request full details of all remuneration received in respect of this transaction.`,
  },
  {
    id: "cooling_off",
    title: "Cooling-Off Rights (LTIA Section 59)",
    category: "cooling_off",
    content: `In terms of Section 59 of the Long-Term Insurance Act, 52 of 1998, you have the right to cancel this policy within 31 days of receipt of the policy document, without penalty and without providing any reason.

HOW TO EXERCISE YOUR RIGHT
To cancel within the cooling-off period:
1. Submit written notice to your adviser or directly to the insurer.
2. Contact details are provided on your policy schedule.
3. Any premiums paid will be refunded in full, provided no valid claim has been submitted during this period.

IMPORTANT NOTES
• The 31-day period commences on the date you receive the policy document, not the date of signature.
• Refunds are typically processed within 10 business days.
• After the cooling-off period, standard cancellation terms apply as set out in the policy wording.

If you have any questions about your cooling-off rights, please contact your adviser or the FSCA at 0800 110 443.`,
  },
  {
    id: "complaints",
    title: "Complaint Procedures & Regulatory Contacts",
    category: "complaints",
    content: `You have the right to lodge a complaint if you are dissatisfied with any aspect of the advice given, the product sold, or the service received.

INTERNAL COMPLAINT PROCESS
Step 1: Contact your adviser directly to resolve the matter informally.
Step 2: If unresolved, submit a formal written complaint to Fairbairn Consult's Complaints Officer:
  Email: complaints@fairbairnconsult.co.za
  Address: PO Box XXXX, Johannesburg, 2000
  Response time: We will acknowledge within 2 business days and resolve within 15 business days.

EXTERNAL ESCALATION
If you are not satisfied with our resolution, you may escalate to:

Financial Sector Conduct Authority (FSCA)
  Website: www.fsca.co.za | Tel: 0800 110 443
  Email: info@fsca.co.za

Ombudsman for Long-Term Insurance
  Website: www.ombud.co.za | Tel: 021 657 5000
  Toll-free: 0860 103 236
  Email: info@ombud.co.za

These bodies provide free services to consumers.`,
  },
  {
    id: "popia",
    title: "Protection of Personal Information (POPIA) — Data Consent",
    category: "popia",
    content: `Fairbairn Consult (Pty) Ltd is a Responsible Party in terms of the Protection of Personal Information Act, 4 of 2013 (POPIA).

PERSONAL INFORMATION WE COLLECT
We collect personal information including your name, identity number, contact details, financial information, health status, and beneficiary details solely for the purpose of providing financial advice and administering your funeral cover policy.

HOW WE USE YOUR INFORMATION
• To assess your insurance needs and provide suitable advice
• To submit your application to the relevant product provider (insurer)
• To administer your policy and process claims
• To comply with legal and regulatory obligations (FAIS, LTIA, FICA)

SHARING OF INFORMATION
Your information may be shared with:
• The product provider (insurer) for underwriting and administration
• Reinsurers as required
• Regulatory bodies in the exercise of their statutory functions

We do not sell your personal information to third parties.

YOUR RIGHTS
You have the right to access, correct, or request deletion of your personal information. To exercise these rights, contact our Information Officer at privacy@fairbairnconsult.co.za.

BY ACCEPTING THIS DISCLOSURE, you consent to the processing of your personal information as described above for the purposes of providing funeral cover and related services.`,
  },
];

export default function Step6Disclosures({ onComplete }: StepProps) {
  const { saveStep6 } = useWizardStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acceptances, setAcceptances] = useState<Record<string, string | null>>(
    () => Object.fromEntries(DISCLOSURES.map((d) => [d.id, null]))
  );

  const acceptedCount = Object.values(acceptances).filter(Boolean).length;
  const allAccepted = acceptedCount === DISCLOSURES.length;

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleAccept(id: string, checked: boolean) {
    setAcceptances((prev) => ({
      ...prev,
      [id]: checked ? new Date().toISOString() : null,
    }));
  }

  function handleAcceptAll() {
    const now = new Date().toISOString();
    const all: Record<string, string> = {};
    DISCLOSURES.forEach((d) => {
      all[d.id] = now;
    });
    setAcceptances(all);
    // Expand none — all accepted
    setExpandedId(null);
  }

  function handleComplete() {
    if (!allAccepted) return;

    const disclosureAcceptances: DisclosureAcceptance[] = DISCLOSURES.map((d) => ({
      disclosureId: d.id,
      acceptedAt: acceptances[d.id] as string,
    }));

    const now = new Date().toISOString();
    saveStep6({
      acceptances: disclosureAcceptances,
      allAccepted: true,
      completedAt: now,
    });
    toast.success("Disclosures accepted and recorded.");
    onComplete();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          FAIS Disclosures
        </h2>
        <p className="text-sm text-gray-500">
          Please read each disclosure carefully and tick to confirm understanding. All 6
          disclosures must be accepted before proceeding.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {acceptedCount} of {DISCLOSURES.length} disclosures accepted
          </span>
          {allAccepted && (
            <span className="flex items-center gap-1.5 text-green-600 font-medium">
              <ShieldCheck className="w-4 h-4" />
              All accepted
            </span>
          )}
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{
              width: `${(acceptedCount / DISCLOSURES.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Disclosure items */}
      <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
        {DISCLOSURES.map((disc) => {
          const isOpen = expandedId === disc.id;
          const isAccepted = Boolean(acceptances[disc.id]);

          return (
            <div key={disc.id} className="bg-white">
              {/* Trigger row */}
              <button
                type="button"
                onClick={() => toggleExpand(disc.id)}
                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isAccepted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                  <span
                    className={`text-sm font-medium truncate ${
                      isAccepted ? "text-green-800" : "text-gray-800"
                    }`}
                  >
                    {disc.title}
                  </span>
                </div>
                <span className="ml-2 shrink-0 text-gray-400">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mt-3">
                    <pre className="whitespace-pre-wrap text-xs text-gray-700 font-sans leading-relaxed">
                      {disc.content}
                    </pre>
                  </div>

                  {/* Acceptance checkbox */}
                  <label className="mt-4 flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isAccepted}
                      onChange={(e) => handleAccept(disc.id, e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-green-600 shrink-0"
                    />
                    <span className="text-sm text-gray-700">
                      I have read and understood the{" "}
                      <strong className="text-gray-900">{disc.title}</strong> disclosure.
                    </span>
                  </label>
                  {acceptances[disc.id] && (
                    <p className="mt-2 ml-7 text-xs text-green-600">
                      Accepted at{" "}
                      {new Date(acceptances[disc.id] as string).toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleAcceptAll}
          disabled={allAccepted}
          className="w-full sm:w-auto text-gray-700 border-gray-300"
        >
          Accept All Disclosures
        </Button>

        <Button
          type="button"
          onClick={handleComplete}
          disabled={!allAccepted}
          className={`w-full sm:w-auto font-semibold px-8 ${
            allAccepted
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {allAccepted ? "Confirm & Continue" : `Accept all to continue (${acceptedCount}/${DISCLOSURES.length})`}
        </Button>
      </div>
    </div>
  );
}
