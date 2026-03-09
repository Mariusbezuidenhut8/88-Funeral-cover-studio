"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import { PlusCircle, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import IDNumberInput from "@/components/shared/IDNumberInput";
import { clientSchema, SA_PROVINCES, ClientFormData } from "@/lib/validations/client.schema";
import { useWizardStore } from "@/lib/store/wizard.store";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

const EMPLOYMENT_OPTIONS = [
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" },
  { value: "student", label: "Student" },
] as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
      {children}
    </h3>
  );
}

function FormField({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

const selectClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

export default function Step2FactFind({ onComplete }: StepProps) {
  const { saveStep2, step2 } = useWizardStore();

  const prefill = step2?.client;

  const {
    register,
    control,
    handleSubmit,
    setValue,
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
      monthlyIncome: prefill?.monthlyIncome ?? 0,
      existingCover: prefill?.existingCover ?? [],
      hasTerminalIllness: prefill?.hasTerminalIllness ?? false,
    },
  });

  const idNumberValue = watch("idNumber");

  const { fields: coverFields, append: appendCover, remove: removeCover } =
    useFieldArray({ control, name: "existingCover" });

  function onSubmit(data: ClientFormData) {
    // Build a Client object from the form data
    const now = new Date().toISOString();
    const client = {
      id: prefill?.id ?? uuidv4(),
      createdAt: prefill?.createdAt ?? now,
      updatedAt: now,
      adviserId: prefill?.adviserId ?? "adviser-1",
      firstName: data.firstName,
      lastName: data.lastName,
      idNumber: data.idNumber,
      dateOfBirth: prefill?.dateOfBirth ?? "",
      gender: (prefill?.gender ?? "male") as "male" | "female",
      age: prefill?.age ?? 0,
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
      monthlyIncome: data.monthlyIncome,
      existingCover: data.existingCover.map((c) => ({
        id: c.id,
        insurer: c.insurer,
        sumAssured: c.sumAssured,
        monthlyPremium: c.monthlyPremium,
        policyNumber: c.policyNumber,
      })),
      hasTerminalIllness: data.hasTerminalIllness,
    };

    saveStep2({ client, completedAt: now });
    toast.success("Client details saved.");
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8" noValidate>
      {/* Section 1 — Personal */}
      <section>
        <SectionTitle>1. Personal Information</SectionTitle>
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
                    // Patch hidden fields on the form via direct store; these are passed at submit time
                    setValue("idNumber", idNumberValue);
                    // Store parsed info for client object construction at submit
                    (window as any).__parsedIdInfo = info;
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
        </div>
      </section>

      {/* Section 2 — Address */}
      <section>
        <SectionTitle>2. Residential Address</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Address Line 1" required error={errors.address?.line1?.message}>
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
          <FormField label="Province" required error={errors.address?.province?.message}>
            <select {...register("address.province")} className={selectClass}>
              <option value="">Select province…</option>
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Postal Code" required error={errors.address?.postalCode?.message}>
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

      {/* Section 3 — Employment */}
      <section>
        <SectionTitle>3. Employment &amp; Income</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Employment Status"
            required
            error={errors.employmentStatus?.message}
          >
            <select {...register("employmentStatus")} className={selectClass}>
              <option value="">Select status…</option>
              {EMPLOYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Monthly Gross Income (ZAR)"
            required
            error={errors.monthlyIncome?.message}
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                R
              </span>
              <input
                type="number"
                min={0}
                step={500}
                {...register("monthlyIncome", { valueAsNumber: true })}
                placeholder="0"
                className={`${inputClass} pl-7`}
              />
            </div>
          </FormField>
        </div>
      </section>

      {/* Section 4 — Existing Cover */}
      <section>
        <SectionTitle>4. Existing Life / Funeral Cover</SectionTitle>
        <div className="flex flex-col gap-3">
          {coverFields.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              No existing policies added. Click below to add one.
            </p>
          )}
          {coverFields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Policy {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCover(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  label="Insurer Name"
                  required
                  error={errors.existingCover?.[index]?.insurer?.message}
                >
                  <input
                    {...register(`existingCover.${index}.insurer`)}
                    type="text"
                    placeholder="e.g. Old Mutual"
                    className={inputClass}
                  />
                </FormField>
                <FormField
                  label="Sum Assured (R)"
                  required
                  error={errors.existingCover?.[index]?.sumAssured?.message}
                >
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    {...register(`existingCover.${index}.sumAssured`, {
                      valueAsNumber: true,
                    })}
                    placeholder="0"
                    className={inputClass}
                  />
                </FormField>
                <FormField
                  label="Monthly Premium (R)"
                  required
                  error={errors.existingCover?.[index]?.monthlyPremium?.message}
                >
                  <input
                    type="number"
                    min={0}
                    step={10}
                    {...register(`existingCover.${index}.monthlyPremium`, {
                      valueAsNumber: true,
                    })}
                    placeholder="0"
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
                sumAssured: 0,
                monthlyPremium: 0,
              })
            }
            className="self-start flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
          >
            <PlusCircle className="w-4 h-4" />
            Add Existing Policy
          </Button>
        </div>
      </section>

      {/* Section 5 — Health */}
      <section>
        <SectionTitle>5. Health Declaration</SectionTitle>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            {...register("hasTerminalIllness")}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 accent-green-600 shrink-0"
          />
          <span className="text-sm text-gray-700">
            I confirm that the client{" "}
            <span className="font-medium text-gray-900">
              has been diagnosed with a terminal illness
            </span>{" "}
            in the last 12 months.
          </span>
        </label>
        {watch("hasTerminalIllness") && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Terminal illness may affect eligibility and waiting
              periods. Please disclose this during underwriting.
            </p>
          </div>
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
