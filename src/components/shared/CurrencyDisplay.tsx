import { cn } from "@/lib/utils/cn";
import { formatZAR } from "@/lib/utils/currency";

interface CurrencyDisplayProps {
  amount: number;
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses: Record<NonNullable<CurrencyDisplayProps["size"]>, string> = {
  sm: "text-lg font-semibold",
  md: "text-2xl font-bold",
  lg: "text-3xl font-bold",
  xl: "text-4xl font-extrabold",
};

const labelSizeClasses: Record<NonNullable<CurrencyDisplayProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export default function CurrencyDisplay({
  amount,
  label,
  size = "md",
}: CurrencyDisplayProps) {
  // Format as "R 15,500" style (no decimals for round amounts)
  const formatted = formatZAR(amount, { showDecimals: amount % 1 !== 0 });
  // Convert "ZAR 15,500.00" / "R15,500.00" to "R 15,500" format
  const display = formatted
    .replace(/^ZAR\s?/, "R ")
    .replace(/\.00$/, "")
    .replace(/^R(\d)/, "R $1");

  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <span className={cn(labelSizeClasses[size], "text-gray-500 font-medium")}>
          {label}
        </span>
      )}
      <span className={cn(sizeClasses[size], "text-gray-900 tabular-nums")}>
        {display}
      </span>
    </div>
  );
}
