/**
 * affordability-check.ts
 *
 * Standalone affordability engine for the Funeral Cover Studio.
 *
 * Determines whether a calculated monthly premium is within the client's
 * recommended affordability range (derived from Step 3 disposable income).
 *
 * Three-tier classification:
 *   within_range          — premium ≤ max (proceed normally)
 *   slightly_above_range  — max < premium ≤ max × 1.15 (warn, allow)
 *   materially_above_range — premium > max × 1.15 (strong warning, allow with note)
 *
 * All thresholds match the FAIS suitability requirement that advisers must
 * document and disclose when a recommendation exceeds the client's stated
 * affordable premium range.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AffordabilityStatus =
  | "within_range"
  | "slightly_above_range"
  | "materially_above_range"
  | "below_minimum"   // Premium is lower than recommended minimum (under-insured risk)
  | "unknown";        // No affordability range captured in Step 3

export interface AffordabilityResult {
  status: AffordabilityStatus;
  /** Short label for badges / pills */
  label: string;
  /** Full explanatory message shown in the UI */
  message: string;
  /** True when the status is a warning the adviser must address */
  requiresAdviserNote: boolean;
  /** Colour tokens for Tailwind — bg and text class pairs */
  colours: {
    bg: string;
    text: string;
    border: string;
  };
  /** How far above the max the premium is, in percent (0 when within range) */
  excessPercent: number;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

/** Maximum allowed overage before escalating from "slightly" to "materially" */
const SLIGHTLY_ABOVE_THRESHOLD = 0.15; // 15% over max

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * checkAffordability
 *
 * @param premium          Calculated total monthly premium (rand)
 * @param affordabilityMin Minimum recommended premium from Step 3 (0 = not captured)
 * @param affordabilityMax Maximum recommended premium from Step 3 (0 = not captured)
 *
 * @returns AffordabilityResult with status, display text, and colour tokens
 *
 * @example
 * const result = checkAffordability(850, 400, 750);
 * // result.status === "slightly_above_range"
 * // result.excessPercent ≈ 13.3
 */
export function checkAffordability(
  premium: number,
  affordabilityMin: number,
  affordabilityMax: number
): AffordabilityResult {
  // Guard: no range captured
  if (affordabilityMax === 0) {
    return {
      status: "unknown",
      label: "No range set",
      message:
        "No affordability range was captured in Step 3. The premium cannot be assessed " +
        "against the client's income. Please document this in the Record of Advice.",
      requiresAdviserNote: true,
      colours: {
        bg: "bg-gray-50",
        text: "text-gray-600",
        border: "border-gray-200",
      },
      excessPercent: 0,
    };
  }

  const excessPercent =
    premium > affordabilityMax
      ? ((premium - affordabilityMax) / affordabilityMax) * 100
      : 0;

  // Below minimum — possible under-insurance
  if (affordabilityMin > 0 && premium < affordabilityMin) {
    return {
      status: "below_minimum",
      label: "Below minimum",
      message:
        `The configured premium of R${fmt(premium)} is below the minimum recommended range ` +
        `of R${fmt(affordabilityMin)}/month. The client may be under-insured relative to the ` +
        "funeral cost gap calculated in Step 3. Consider increasing cover or noting the " +
        "client's instruction to choose lower cover in the Record of Advice.",
      requiresAdviserNote: true,
      colours: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      },
      excessPercent: 0,
    };
  }

  // Within range
  if (premium <= affordabilityMax) {
    return {
      status: "within_range",
      label: "Within recommended range",
      message:
        `The configured premium of R${fmt(premium)}/month is within the recommended range of ` +
        `R${fmt(affordabilityMin)}–R${fmt(affordabilityMax)}/month. ` +
        "This configuration is suitable based on the income declared in the fact find.",
      requiresAdviserNote: false,
      colours: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      },
      excessPercent: 0,
    };
  }

  // Slightly above range (max < premium ≤ max × 1.15)
  if (premium <= affordabilityMax * (1 + SLIGHTLY_ABOVE_THRESHOLD)) {
    return {
      status: "slightly_above_range",
      label: "Slightly above range",
      message:
        `The configured premium of R${fmt(premium)}/month is slightly above the maximum ` +
        `recommended range of R${fmt(affordabilityMax)}/month ` +
        `(${excessPercent.toFixed(1)}% over). ` +
        "Please confirm with the client that this premium is sustainable and document " +
        "the client's informed instruction in the Record of Advice.",
      requiresAdviserNote: true,
      colours: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      },
      excessPercent,
    };
  }

  // Materially above range (premium > max × 1.15)
  return {
    status: "materially_above_range",
    label: "Above recommended range",
    message:
      `The configured premium of R${fmt(premium)}/month materially exceeds the maximum ` +
      `recommended range of R${fmt(affordabilityMax)}/month ` +
      `(${excessPercent.toFixed(1)}% over). ` +
      "This configuration may not be affordable based on the income declared. " +
      "The adviser must document the basis for recommending this configuration and " +
      "obtain the client's explicit informed consent. Consider reducing cover amounts " +
      "or removing optional benefits to bring the premium within range.",
    requiresAdviserNote: true,
    colours: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
    },
    excessPercent,
  };
}

// ─── Gauge helpers ────────────────────────────────────────────────────────────

/**
 * Returns the position of the premium indicator on a gauge bar (0–100%).
 * The gauge scale goes from 0 to max × 1.5, so anything above max × 1.5
 * is clamped to 100%.
 */
export function getGaugePosition(
  premium: number,
  affordabilityMax: number
): number {
  if (affordabilityMax === 0) return 50;
  return Math.min((premium / (affordabilityMax * 1.5)) * 100, 100);
}

/**
 * Returns the left offset and width (%) of the "safe zone" band on the gauge.
 * Used to render the green recommended range segment on the progress bar.
 */
export function getGaugeSafeZone(
  affordabilityMin: number,
  affordabilityMax: number
): { left: number; width: number } {
  const scale = affordabilityMax * 1.5;
  if (scale === 0) return { left: 0, width: 100 };
  return {
    left: (affordabilityMin / scale) * 100,
    width: ((affordabilityMax - affordabilityMin) / scale) * 100,
  };
}

// ─── Adviser note generator ────────────────────────────────────────────────────

/**
 * Returns a suggested adviser note for inclusion in the ROA when the premium
 * is outside the recommended range.  Returns null when no note is required.
 */
export function getAdviserNoteTemplate(
  result: AffordabilityResult,
  clientName: string
): string | null {
  if (!result.requiresAdviserNote) return null;

  if (result.status === "below_minimum") {
    return (
      `${clientName} has elected cover at a premium of R${result.excessPercent === 0 ? "" : ""}` +
      "below the minimum recommended range. The client has been advised of the potential " +
      "under-insurance risk and has confirmed their preference for lower cover."
    );
  }

  if (result.status === "slightly_above_range") {
    return (
      `${clientName} has elected cover at a premium that is slightly above the recommended ` +
      `affordability range (${result.excessPercent.toFixed(1)}% above maximum). ` +
      "The client has been made aware of this and has confirmed the premium is sustainable."
    );
  }

  if (result.status === "materially_above_range") {
    return (
      `${clientName} has elected cover at a premium that materially exceeds the recommended ` +
      `affordability range (${result.excessPercent.toFixed(1)}% above maximum). ` +
      "The adviser has explained the risk of premium unaffordability and policy lapse. " +
      "The client has provided informed consent to proceed at this premium level."
    );
  }

  if (result.status === "unknown") {
    return (
      `No affordability range was established for ${clientName} in the fact find. ` +
      "The premium could not be assessed against a recommended range. " +
      "The adviser has discussed premium affordability with the client."
    );
  }

  return null;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
