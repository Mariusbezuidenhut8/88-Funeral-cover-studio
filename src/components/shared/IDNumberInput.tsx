"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { parseSAId } from "@/lib/engine/sa-id";
import { formatDate } from "@/lib/utils/dates";

interface ParsedIdInfo {
  dateOfBirth: string;
  age: number;
  gender: "male" | "female";
  isCitizen: boolean;
}

interface IDNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onParsed: (info: ParsedIdInfo) => void;
  error?: string;
  label?: string;
}

export default function IDNumberInput({
  value,
  onChange,
  onParsed,
  error,
  label = "SA ID Number",
}: IDNumberInputProps) {
  const [parsedInfo, setParsedInfo] = useState<ParsedIdInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleBlur() {
    if (!value) {
      setParsedInfo(null);
      setValidationError(null);
      return;
    }
    const result = parseSAId(value);
    if (result.isValid && result.dateOfBirth && result.age !== undefined && result.gender) {
      const info: ParsedIdInfo = {
        dateOfBirth: result.dateOfBirth,
        age: result.age,
        gender: result.gender,
        isCitizen: result.isCitizen ?? true,
      };
      setParsedInfo(info);
      setValidationError(null);
      onParsed(info);
    } else {
      setParsedInfo(null);
      setValidationError(result.error ?? "Invalid SA ID number");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 13);
    onChange(raw);
    // Clear previous validation when editing
    if (parsedInfo) setParsedInfo(null);
    if (validationError) setValidationError(null);
  }

  const displayError = error ?? validationError;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={13}
          placeholder="e.g. 8501155800086"
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500",
            "transition-colors duration-150",
            displayError && "border-red-400 focus:ring-red-400 focus:border-red-400",
            parsedInfo && "border-green-400 focus:ring-green-500 focus:border-green-500",
            !displayError && !parsedInfo && "border-gray-300"
          )}
        />
        {parsedInfo && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
        )}
        {displayError && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
        )}
      </div>

      {displayError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {displayError}
        </p>
      )}

      {parsedInfo && !displayError && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span>Born: {formatDate(parsedInfo.dateOfBirth)}</span>
          <span className="text-green-400">|</span>
          <span>Age: {parsedInfo.age}</span>
          <span className="text-green-400">|</span>
          <span>Gender: {parsedInfo.gender === "male" ? "Male" : "Female"}</span>
          <span className="text-green-400">|</span>
          <span>{parsedInfo.isCitizen ? "SA Citizen" : "Permanent Resident"}</span>
        </div>
      )}
    </div>
  );
}
