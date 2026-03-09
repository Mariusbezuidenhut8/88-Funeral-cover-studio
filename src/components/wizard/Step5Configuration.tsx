"use client";

import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { PlusCircle, Trash2, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import {
  calculateFullPremium,
  toPremiumBreakdown,
} from "@/lib/engine/premium-calculator";
import { checkMemberEligibility } from "@/lib/engine/eligibility";
import { useWizardStore } from "@/lib/store/wizard.store";
import { Product, MemberType } from "@/types/product.types";
import { FamilyMember, Beneficiary } from "@/types/family.types";
import { clamp } from "@/lib/engine/needs-calculator";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  main: "Main Member",
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  parent_in_law: "Parent-in-Law",
  extended: "Extended Family",
};

const ADDABLE_TYPES: MemberType[] = [
  "spouse",
  "child",
  "parent",
  "parent_in_law",
  "extended",
];

interface MemberForm {
  type: MemberType;
  firstName: string;
  lastName: string;
  age: string;
  sumAssured: number;
}

const DEFAULT_MEMBER_FORM: MemberForm = {
  type: "spouse",
  firstName: "",
  lastName: "",
  age: "",
  sumAssured: 10000,
};

interface BeneficiaryForm {
  firstName: string;
  lastName: string;
  relationship: string;
  percentage: string;
}

const DEFAULT_BENE_FORM: BeneficiaryForm = {
  firstName: "",
  lastName: "",
  relationship: "",
  percentage: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

const selectClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
      {children}
    </h3>
  );
}

export default function Step5Configuration({ onComplete }: StepProps) {
  const { step2, step3, step4, saveStep5 } = useWizardStore();

  const recommendedCover = step3?.recommendedCover ?? 10000;
  const mainMemberAge = step2?.client?.age ?? 35;
  const selectedProductId = step4?.selectedProductId;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [sumAssured, setSumAssured] = useState(recommendedCover);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberForm>({ ...DEFAULT_MEMBER_FORM });
  const [memberFormError, setMemberFormError] = useState("");

  const [showBeneForm, setShowBeneForm] = useState(false);
  const [beneForm, setBeneForm] = useState<BeneficiaryForm>({ ...DEFAULT_BENE_FORM });
  const [beneFormError, setBeneFormError] = useState("");

  const [errors, setErrors] = useState<string[]>([]);

  // Fetch selected product
  useEffect(() => {
    if (!selectedProductId) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to load products");
        const all: Product[] = await res.json();
        const found = all.find((p) => p.id === selectedProductId) ?? null;
        setProduct(found);
        if (found) {
          const clamped = clamp(
            recommendedCover,
            found.minSumAssured,
            found.maxSumAssured
          );
          setSumAssured(clamped);
        }
      } catch {
        toast.error("Failed to load product configuration.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedProductId, recommendedCover]);

  const premiumResult = useMemo(() => {
    if (!product) return null;
    return calculateFullPremium(product, mainMemberAge, sumAssured, members);
  }, [product, mainMemberAge, sumAssured, members]);

  const totalBenePercent = beneficiaries.reduce(
    (s, b) => s + b.percentage,
    0
  );

  // Member eligibility check for form
  const memberEligibility = useMemo(() => {
    if (!product || !memberForm.type) return null;
    const existingCount = members.filter((m) => m.type === memberForm.type).length;
    return checkMemberEligibility(
      product,
      memberForm.type,
      parseInt(memberForm.age) || 0,
      existingCount
    );
  }, [product, memberForm.type, memberForm.age, members]);

  function handleAddMember() {
    if (!product) return;
    const age = parseInt(memberForm.age);
    if (
      !memberForm.firstName.trim() ||
      !memberForm.lastName.trim() ||
      isNaN(age) ||
      age < 0 ||
      age > 100
    ) {
      setMemberFormError("Please fill in all fields with a valid age (0–100).");
      return;
    }
    if (memberEligibility && !memberEligibility.eligible) {
      setMemberFormError(memberEligibility.reason ?? "Member is not eligible.");
      return;
    }
    setMemberFormError("");

    const memberSumAssured = clamp(
      memberForm.sumAssured,
      product.minSumAssured,
      product.maxSumAssured
    );

    const newMember: FamilyMember = {
      id: uuidv4(),
      type: memberForm.type,
      firstName: memberForm.firstName.trim(),
      lastName: memberForm.lastName.trim(),
      age,
      sumAssured: memberSumAssured,
      isEligible: memberEligibility?.eligible ?? true,
      eligibilityNote: memberEligibility?.reason,
    };
    setMembers((prev) => [...prev, newMember]);
    setMemberForm({ ...DEFAULT_MEMBER_FORM });
    setShowMemberForm(false);
  }

  function handleRemoveMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function handleAddBeneficiary() {
    const pct = parseFloat(beneForm.percentage);
    if (
      !beneForm.firstName.trim() ||
      !beneForm.lastName.trim() ||
      !beneForm.relationship.trim() ||
      isNaN(pct) ||
      pct <= 0 ||
      pct > 100
    ) {
      setBeneFormError("Please complete all fields. Percentage must be between 1 and 100.");
      return;
    }
    if (totalBenePercent + pct > 100) {
      setBeneFormError(
        `Adding ${pct}% would exceed 100%. Current total is ${totalBenePercent}%.`
      );
      return;
    }
    setBeneFormError("");
    const newBene: Beneficiary = {
      id: uuidv4(),
      firstName: beneForm.firstName.trim(),
      lastName: beneForm.lastName.trim(),
      relationship: beneForm.relationship.trim(),
      percentage: pct,
    };
    setBeneficiaries((prev) => [...prev, newBene]);
    setBeneForm({ ...DEFAULT_BENE_FORM });
    setShowBeneForm(false);
  }

  function handleRemoveBeneficiary(id: string) {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  }

  function handleComplete() {
    const errs: string[] = [];
    if (!product) errs.push("No product loaded.");
    if (beneficiaries.length === 0) errs.push("At least one beneficiary is required.");
    if (totalBenePercent !== 100)
      errs.push(
        `Beneficiary percentages must total 100%. Current total: ${totalBenePercent}%.`
      );
    setErrors(errs);
    if (errs.length > 0) return;
    if (!premiumResult || !product) return;

    const now = new Date().toISOString();
    saveStep5({
      sumAssured,
      monthlyPremium: premiumResult.total,
      members,
      beneficiaries,
      premiumBreakdown: toPremiumBreakdown(premiumResult),
      completedAt: now,
    });
    toast.success("Policy configuration saved.");
    onComplete();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <p className="text-sm text-gray-500">Loading product configuration…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          No product selected. Please go back and select a product.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Configure Your Policy
        </h2>
        <p className="text-sm text-gray-500">
          Customise the sum assured, add family members, and nominate beneficiaries.
        </p>
      </div>

      {/* Product info */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
        <div>
          <span className="text-gray-500">Product: </span>
          <strong className="text-gray-900">{product.name}</strong>
        </div>
        <div>
          <span className="text-gray-500">Insurer: </span>
          <strong className="text-gray-900">{product.insurer}</strong>
        </div>
        <div>
          <span className="text-gray-500">Waiting Period: </span>
          <strong className="text-gray-900">{product.waitingPeriodMonths} months</strong>
        </div>
      </div>

      {/* Sum Assured Slider */}
      <section>
        <SectionTitle>Sum Assured</SectionTitle>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{formatZAR(product.minSumAssured, { showDecimals: false })}</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatZAR(sumAssured, { showDecimals: false })}
            </span>
            <span>{formatZAR(product.maxSumAssured, { showDecimals: false })}</span>
          </div>
          <input
            type="range"
            min={product.minSumAssured}
            max={product.maxSumAssured}
            step={product.sumAssuredStep}
            value={sumAssured}
            onChange={(e) => setSumAssured(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-600"
          />
          {premiumResult && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center">
              <p className="text-sm text-gray-600">Estimated Monthly Premium</p>
              <p className="text-3xl font-extrabold text-green-700">
                {formatZAR(premiumResult.total)}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Family Members */}
      <section>
        <SectionTitle>Family Members</SectionTitle>
        <div className="flex flex-col gap-3">
          {members.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              No family members added. The policy covers the main member only.
            </p>
          )}
          {members.map((m) => {
            const memberPremium =
              premiumResult?.memberBreakdown.find((mb) => mb.memberId === m.id)
                ?.premium ?? 0;
            return (
              <div
                key={m.id}
                className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">
                      {m.firstName} {m.lastName}
                    </span>
                    <span className="text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5">
                      {MEMBER_TYPE_LABELS[m.type]}
                    </span>
                    <span className="text-xs text-gray-500">Age {m.age}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>Cover: {formatZAR(m.sumAssured, { showDecimals: false })}</span>
                    <span>Premium: {formatZAR(memberPremium)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(m.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {showMemberForm && (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-gray-700">Add Family Member</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Member Type
                  </label>
                  <select
                    value={memberForm.type}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, type: e.target.value as MemberType }))
                    }
                    className={selectClass}
                  >
                    {ADDABLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {MEMBER_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={memberForm.firstName}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                    placeholder="First name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={memberForm.lastName}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                    placeholder="Last name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Age
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={memberForm.age}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, age: e.target.value }))
                    }
                    placeholder="e.g. 34"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Sum Assured (R)
                  </label>
                  <input
                    type="number"
                    min={product.minSumAssured}
                    max={product.maxSumAssured}
                    step={product.sumAssuredStep}
                    value={memberForm.sumAssured}
                    onChange={(e) =>
                      setMemberForm((p) => ({
                        ...p,
                        sumAssured: Number(e.target.value),
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Eligibility feedback */}
              {memberForm.age && memberEligibility && (
                <div
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm
                    ${memberEligibility.eligible
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                >
                  {memberEligibility.eligible ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  )}
                  <span>
                    {memberEligibility.eligible
                      ? "Member is eligible for cover."
                      : memberEligibility.reason}
                  </span>
                </div>
              )}
              {memberEligibility?.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {w}
                </div>
              ))}

              {memberFormError && (
                <p className="text-xs text-red-600">{memberFormError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleAddMember}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Add Member
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowMemberForm(false);
                    setMemberForm({ ...DEFAULT_MEMBER_FORM });
                    setMemberFormError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!showMemberForm && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMemberForm(true)}
              className="self-start flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
            >
              <PlusCircle className="w-4 h-4" />
              Add Member
            </Button>
          )}
        </div>
      </section>

      {/* Beneficiaries */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
          <h3 className="text-base font-semibold text-gray-800">Beneficiaries</h3>
          <span
            className={`text-sm font-medium ${
              totalBenePercent === 100
                ? "text-green-600"
                : totalBenePercent > 100
                ? "text-red-600"
                : "text-gray-500"
            }`}
          >
            {totalBenePercent}% of 100%
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {beneficiaries.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              No beneficiaries added. At least one is required.
            </p>
          )}
          {beneficiaries.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {b.firstName} {b.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {b.relationship} — {b.percentage}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveBeneficiary(b.id)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {showBeneForm && (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-gray-700">Add Beneficiary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={beneForm.firstName}
                    onChange={(e) =>
                      setBeneForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                    placeholder="First name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={beneForm.lastName}
                    onChange={(e) =>
                      setBeneForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                    placeholder="Last name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={beneForm.relationship}
                    onChange={(e) =>
                      setBeneForm((p) => ({ ...p, relationship: e.target.value }))
                    }
                    placeholder="e.g. Spouse, Child"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Percentage (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={beneForm.percentage}
                    onChange={(e) =>
                      setBeneForm((p) => ({ ...p, percentage: e.target.value }))
                    }
                    placeholder={`Remaining: ${100 - totalBenePercent}%`}
                    className={inputClass}
                  />
                </div>
              </div>
              {beneFormError && (
                <p className="text-xs text-red-600">{beneFormError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleAddBeneficiary}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Add Beneficiary
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBeneForm(false);
                    setBeneForm({ ...DEFAULT_BENE_FORM });
                    setBeneFormError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!showBeneForm && totalBenePercent < 100 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBeneForm(true)}
              className="self-start flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
            >
              <PlusCircle className="w-4 h-4" />
              Add Beneficiary
            </Button>
          )}
        </div>
      </section>

      {/* Premium Breakdown */}
      {premiumResult && (
        <section>
          <SectionTitle>Premium Breakdown</SectionTitle>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 text-gray-600">
                    Main Member ({step2?.client?.firstName ?? "Client"})
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {formatZAR(premiumResult.mainMemberPremium)}
                  </td>
                </tr>
                {premiumResult.memberBreakdown.map((mb) => (
                  <tr key={mb.memberId} className="border-b border-gray-100">
                    <td className="px-4 py-2.5 text-gray-600">
                      {mb.name}{" "}
                      <span className="text-xs text-gray-400">({mb.type})</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                      {formatZAR(mb.premium)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600">Administration Fee</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {formatZAR(premiumResult.adminFee)}
                  </td>
                </tr>
                <tr className="bg-green-50 border-t-2 border-green-200">
                  <td className="px-4 py-3 font-bold text-gray-900">
                    Total Monthly Premium
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-extrabold text-green-700">
                    {formatZAR(premiumResult.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-2">
          {errors.map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3"
            >
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{e}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleComplete}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8"
        >
          Save &amp; Continue
        </Button>
      </div>
    </div>
  );
}
