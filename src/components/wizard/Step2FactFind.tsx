"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import {
  PlusCircle,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import IDNumberInput from "@/components/shared/IDNumberInput";
import {
  clientSchema,
  SA_PROVINCES,
  INCOME_BRACKETS,
  MARITAL_STATUS_OPTIONS,
  PAYMENT_DATE_OPTIONS,
  COVER_TYPES,
  POLICY_OWNER_OPTIONS,
  ClientFormData,
} from "@/lib/validations/client.schema";
import { INCOME_BRACKET_MIDPOINTS, IncomeBracket } from "@/types/client.types";
import { useWizardStore } from "@/lib/store/wizard.store";
import { parseSAId } from "@/lib/engine/sa-id";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

// ─── Reusable layout helpers ─────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {message}
    </p>
  );
}

function SectionTitle({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 pb-2 mb-5">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold shrink-0">
        {number}
      </span>
      <h3 className="text-base font-semibold text-gray-800">{children}</h3>
    </div>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {hint && <p className="text-xs text-gray-400 -mt-0.5">{hint}</p>}
      {children}
      <FieldError message={error} />
    </div>
  );
}

function RadioOption({
  value,
  label,
  checked,
  onChange,
}: {
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 cursor-pointer transition-all text-sm font-medium ${
        checked
          ? "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500"
          : "border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50/40"
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
          checked ? "border-green-600" : "border-gray-400"
        }`}
      >
        {checked && (
          <span className="w-2 h-2 rounded-full bg-green-600 block" />
        )}
      </span>
      {label}
      <input
        type="radio"
        className="sr-only"
        value={value}
        checked={checked}
        onChange={onChange}
      />
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

const selectClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Step2FactFind({ onComplete }: StepProps) {
  const { saveStep2, step2 } = useWizardStore();
  const prefill = step2?.client;

  const [parsedId, setParsedId] = useState<{
    dateOfBirth: string;
    age: number;
    gender: "male" | "female";
  } | null>(
    prefill
      ? { dateOfBirth: prefill.dateOfBirth, age: prefill.age, gender: prefill.gender }
      : null
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      firstName: prefill?.firstName ?? "",
      lastName: prefill?.lastName ?? "",
      idNumber: prefill?.idNumber ?? "",
      mobile: prefill?.mobile ?? "",
      email: prefill?.email ?? "",
      address: {
        line1: prefill?.address?.line1 ?? "",
        line2: prefill?.address?.line2 ?? "",
        suburb: prefill?.address?.suburb ?? "",
        city: prefill?.address?.city ?? "",
        province: prefill?.address?.province ?? undefined,
        postalCode: prefill?.address?.postalCode ?? "",
      },
      employmentStatus: prefill?.employmentStatus ?? undefined,
      maritalStatus: prefill?.maritalStatus ?? undefined,
      incomeBracket: prefill?.incomeBracket ?? undefined,
      preferredPaymentDate: prefill?.preferredPaymentDate ?? undefined,
      existingCover: prefill?.existingCover ?? [],
      hasTerminalIllness:
        prefill?.hasTerminalIllness === true
          ? "yes"
          : prefill?.hasTerminalIllness === false
          ? "no"
          : undefined,
      consentGiven: undefined,
    },
  });

  const { fields: coverFields, append: appendCover, remove: removeCover } =
    useFieldArray({ control, name: "existingCover" });

  const hasTerminalIllness = watch("hasTerminalIllness");

  function onSubmit(data: ClientFormData) {
    const now = new Date().toISOString();

    const idInfo = parsedId ?? (() => {
      const p = parseSAId(data.idNumber);
      return p.isValid
        ? { dateOfBirth: p.dateOfBirth!, age: p.age!, gender: p.gender! }
        : { dateOfBirth: "", age: 0, gender: "male" as const };
    })();

    const incomeBracket = data.incomeBracket as IncomeBracket;
    const monthlyIncome = INCOME_BRACKET_MIDPOINTS[incomeBracket];

    const client = {
      id: prefill?.id ?? uuidv4(),
      createdAt: prefill?.createdAt ?? now,
      updatedAt: now,
      adviserId: prefill?.adviserId ?? "adviser-1",
      firstName: data.firstName,
      lastName: data.lastName,
      idNumber: data.idNumber,
      dateOfBirth: idInfo.dateOfBirth,
      gender: idInfo.gender,
      age: idInfo.age,
      mobile: data.mobile,
      email: data.email,
      address: {
        line1: data.address.line1,
        line2: data.address.line2,
        suburb: data.address.suburb,
        city: data.address.city,
        province: data.address.province,
        postalCode: data.address.postalCode,
      },
      employmentStatus: data.employmentStatus,
      maritalStatus: data.maritalStatus,
      incomeBracket,
      monthlyIncome,
      preferredPaymentDate: data.preferredPaymentDate,
      existingCover: data.existingCover.map((c) => ({
        id: c.id,
        insurer: c.insurer,
        coverType: c.coverType,
        sumAssured: c.sumAssured,
        monthlyPremium: c.monthlyPremium,
        policyOwner: c.policyOwner,
        policyStartDate: c.policyStartDate,
        policyNumber: c.policyNumber,
      })),
      hasTerminalIllness: data.hasTerminalIllness === "yes",
    };

    saveStep2({ client, completedAt: now });
    toast.success("Your details have been saved.");
    onComplete();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-8"
      noValidate
    >
      {/* Trust statement */}
      <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
        <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <p className="text-sm text-green-800">
          Your information helps us recommend the most suitable funeral cover.
          We keep your information{" "}
          <span className="font-semibold">private and secure</span>.
        </p>
      </div>

      {/* ── 1. Personal Information ── */}
      <section>
        <SectionTitle number={1}>Personal Information</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="First Name" required error={errors.firstName?.message}>
            <input
              {...register("firstName")}
              type="text"
              placeholder="e.g. Thabo"
              className={inputClass}
            />
          </FormField>

          <FormField label="Last Name" required error={errors.lastName?.message}>
            <input
              {...register("lastName")}
              type="text"
              placeholder="e.g. Nkosi"
              className={inputClass}
            />
          </FormField>

          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="idNumber"
              render={({ field }) => (
                <IDNumberInput
                  value={field.value}
                  onChange={field.onChange}
                  onParsed={(info) => {
                    if (info.dateOfBirth && info.age != null && info.gender) {
                      setParsedId({
                        dateOfBirth: info.dateOfBirth,
                        age: info.age,
                        gender: info.gender,
                      });
                    }
                  }}
                  error={errors.idNumber?.message}
                  label="SA ID Number *"
                />
              )}
            />
          </div>

          <FormField label="Mobile Number" required error={errors.mobile?.message}>
            <input
              {...register("mobile")}
              type="tel"
              placeholder="e.g. 0821234567"
              className={inputClass}
            />
          </FormField>

          <FormField label="Email Address" required error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              placeholder="e.g. thabo@example.com"
              className={inputClass}
            />
          </FormField>

          {/* Marital Status */}
          <div className="sm:col-span-2">
            <FormField
              label="Marital Status"
              required
              error={errors.maritalStatus?.message}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                <Controller
                  control={control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <>
                      {MARITAL_STATUS_OPTIONS.map((opt) => (
                        <RadioOption
                          key={opt.value}
                          value={opt.value}
                          label={opt.label}
                          checked={field.value === opt.value}
                          onChange={() => field.onChange(opt.value)}
                        />
                      ))}
                    </>
                  )}
                />
              </div>
            </FormField>
          </div>
        </div>
      </section>

      {/* ── 2. Residential Address ── */}
      <section>
        <SectionTitle number={2}>Residential Address</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField
              label="Address Line 1"
              required
              error={errors.address?.line1?.message}
            >
              <input
                {...register("address.line1")}
                type="text"
                placeholder="e.g. 12 Main Street"
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Address Line 2" error={errors.address?.line2?.message}>
              <input
                {...register("address.line2")}
                type="text"
                placeholder="Apartment, unit, etc. (optional)"
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField label="Suburb" required error={errors.address?.suburb?.message}>
            <input
              {...register("address.suburb")}
              type="text"
              placeholder="e.g. Sandton"
              className={inputClass}
            />
          </FormField>
          <FormField label="City" required error={errors.address?.city?.message}>
            <input
              {...register("address.city")}
              type="text"
              placeholder="e.g. Johannesburg"
              className={inputClass}
            />
          </FormField>
          <FormField
            label="Province"
            required
            error={errors.address?.province?.message}
          >
            <select {...register("address.province")} className={selectClass}>
              <option value="">Select province…</option>
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Postal Code"
            required
            error={errors.address?.postalCode?.message}
          >
            <input
              {...register("address.postalCode")}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="e.g. 2196"
              className={inputClass}
            />
          </FormField>
        </div>
      </section>

      {/* ── 3. Employment & Income ── */}
      <section>
        <SectionTitle number={3}>Employment &amp; Income</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField
            label="Employment Status"
            required
            error={errors.employmentStatus?.message}
          >
            <select {...register("employmentStatus")} className={selectClass}>
              <option value="">Select status…</option>
              <option value="employed">Employed</option>
              <option value="self-employed">Self-Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="retired">Retired</option>
              <option value="student">Student</option>
            </select>
          </FormField>

          <div className="sm:col-span-2">
            <FormField
              label="Monthly Gross Income"
              required
              hint="Select the bracket that best describes your monthly income before tax."
              error={errors.incomeBracket?.message}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <Controller
                  control={control}
                  name="incomeBracket"
                  render={({ field }) => (
                    <>
                      {INCOME_BRACKETS.map((opt) => (
                        <RadioOption
                          key={opt.value}
                          value={opt.value}
                          label={opt.label}
                          checked={field.value === opt.value}
                          onChange={() => field.onChange(opt.value)}
                        />
                      ))}
                    </>
                  )}
                />
              </div>
            </FormField>
          </div>

          {/* Preferred payment date */}
          <div className="sm:col-span-2">
            <FormField
              label="Preferred Premium Payment Date"
              required
              hint="The day of the month your debit order will run."
              error={errors.preferredPaymentDate?.message}
            >
              <div className="flex flex-wrap gap-2 mt-1">
                <Controller
                  control={control}
                  name="preferredPaymentDate"
                  render={({ field }) => (
                    <>
                      {PAYMENT_DATE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center justify-center min-w-[72px] rounded-lg border px-4 py-2.5 cursor-pointer text-sm font-semibold transition-all ${
                            field.value === opt.value
                              ? "border-green-500 bg-green-600 text-white ring-1 ring-green-500"
                              : "border-gray-200 bg-white text-gray-700 hover:border-green-300"
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            value={opt.value}
                            checked={field.value === opt.value}
                            onChange={() => field.onChange(opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </>
                  )}
                />
              </div>
            </FormField>
          </div>
        </div>
      </section>

      {/* ── 4. Existing Cover ── */}
      <section>
        <SectionTitle number={4}>Existing Life / Funeral Cover</SectionTitle>
        <p className="text-sm text-gray-500 mb-4">
          List any active funeral or life cover policies you currently hold. Leave blank if you have none.
        </p>
        <div className="flex flex-col gap-3">
          {coverFields.length === 0 && (
            <p className="text-sm text-gray-400 italic py-2">
              No existing policies added yet.
            </p>
          )}

          {coverFields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-gray-200 bg-gray-50/80 p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700">
                  Policy {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCover(index)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  label="Policy Provider"
                  required
                  error={errors.existingCover?.[index]?.insurer?.message}
                >
                  <input
                    {...register(`existingCover.${index}.insurer`)}
                    type="text"
                    placeholder="e.g. Old Mutual, Sanlam, Hollard"
                    className={inputClass}
                  />
                </FormField>

                <FormField
                  label="Cover Type"
                  required
                  error={errors.existingCover?.[index]?.coverType?.message}
                >
                  <select
                    {...register(`existingCover.${index}.coverType`)}
                    className={selectClass}
                  >
                    <option value="">Select type…</option>
                    {COVER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Cover Amount (R)"
                  required
                  error={errors.existingCover?.[index]?.sumAssured?.message}
                >
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium select-none">
                      R
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      {...register(`existingCover.${index}.sumAssured`, {
                        valueAsNumber: true,
                      })}
                      placeholder="0"
                      className={`${inputClass} pl-7`}
                    />
                  </div>
                </FormField>

                <FormField
                  label="Monthly Premium (R)"
                  required
                  error={errors.existingCover?.[index]?.monthlyPremium?.message}
                >
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium select-none">
                      R
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      {...register(`existingCover.${index}.monthlyPremium`, {
                        valueAsNumber: true,
                      })}
                      placeholder="0"
                      className={`${inputClass} pl-7`}
                    />
                  </div>
                </FormField>

                <FormField
                  label="Policy Owner"
                  required
                  error={errors.existingCover?.[index]?.policyOwner?.message}
                >
                  <select
                    {...register(`existingCover.${index}.policyOwner`)}
                    className={selectClass}
                  >
                    <option value="">Select owner…</option>
                    {POLICY_OWNER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Policy Start Date"
                  required
                  error={errors.existingCover?.[index]?.policyStartDate?.message}
                >
                  <input
                    {...register(`existingCover.${index}.policyStartDate`)}
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              appendCover({
                id: uuidv4(),
                insurer: "",
                coverType: "funeral",
                sumAssured: 0,
                monthlyPremium: 0,
                policyOwner: "self",
                policyStartDate: "",
              })
            }
            className="self-start flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
          >
            <PlusCircle className="w-4 h-4" />
            Add Policy
          </Button>
        </div>
      </section>

      {/* ── 5. Health Declaration ── */}
      <section>
        <SectionTitle number={5}>Health Declaration</SectionTitle>
        <p className="text-sm text-gray-600 mb-3">
          Has the client been diagnosed with a terminal illness in the last 12 months?
        </p>
        <FormField label="" error={errors.hasTerminalIllness?.message}>
          <div className="flex gap-3">
            <Controller
              control={control}
              name="hasTerminalIllness"
              render={({ field }) => (
                <>
                  <RadioOption
                    value="yes"
                    label="Yes"
                    checked={field.value === "yes"}
                    onChange={() => field.onChange("yes")}
                  />
                  <RadioOption
                    value="no"
                    label="No"
                    checked={field.value === "no"}
                    onChange={() => field.onChange("no")}
                  />
                </>
              )}
            />
          </div>
        </FormField>

        {hasTerminalIllness === "yes" && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Important Notice
              </p>
              <p className="text-sm text-amber-800 mt-0.5">
                Some funeral policies may not be available if a terminal illness
                has been diagnosed. A specialist adviser may need to assist with
                this application.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Declaration & Consent ── */}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-500 shrink-0" />
          <h3 className="text-sm font-semibold text-gray-700">Declaration</h3>
        </div>
        <Controller
          control={control}
          name="consentGiven"
          render={({ field }) => (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={field.value === true}
                onChange={(e) =>
                  field.onChange(e.target.checked ? true : undefined)
                }
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 accent-green-600 shrink-0 cursor-pointer"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I confirm that the information provided is accurate and may be
                used to provide funeral cover advice.
              </span>
            </label>
          )}
        />
        {errors.consentGiven && (
          <FieldError message={errors.consentGiven.message} />
        )}
      </section>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8"
        >
          Save &amp; Continue
        </Button>
      </div>
    </form>
  );
}
