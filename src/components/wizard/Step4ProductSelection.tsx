"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Star, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import { recommendProducts } from "@/lib/engine/product-recommender";
import { useWizardStore } from "@/lib/store/wizard.store";
import { Product, ProductRecommendation } from "@/types/product.types";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  basic: { label: "Basic", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  standard: { label: "Standard", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  premium: { label: "Premium", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  elite: { label: "Elite", cls: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function Step4ProductSelection({ onComplete }: StepProps) {
  const { step2, step3, saveStep4 } = useWizardStore();

  const recommendedCover = step3?.recommendedCover ?? 0;
  const monthlyIncome = step2?.client?.monthlyIncome ?? 0;
  const mainMemberAge = step2?.client?.age ?? 35;

  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        const data: Product[] = await res.json();
        setProducts(data);

        const recs = recommendProducts(data, {
          recommendedCover,
          monthlyIncome,
          mainMemberAge,
          requiredMemberTypes: [],
          familyMembers: [],
        });
        // Show top 4
        setRecommendations(recs.slice(0, 4));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        toast.error("Could not load products. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [recommendedCover, monthlyIncome, mainMemberAge]);

  function handleSelect(rec: ProductRecommendation) {
    setSelectedId(rec.product.id);
    const now = new Date().toISOString();
    saveStep4({
      selectedProductId: rec.product.id,
      selectedProductName: rec.product.name,
      selectionReason: rec.notes.join("; ") || "Best match for client needs",
      completedAt: now,
    });
    toast.success(`${rec.product.name} selected.`);
    onComplete();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <p className="text-sm text-gray-500">Loading available products…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 max-w-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Could not load products</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setLoading(true);
            // Trigger re-mount by resetting
            setTimeout(() => window.location.reload(), 100);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No suitable products found. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Recommended Products
        </h2>
        <p className="text-sm text-gray-500">
          Products are ranked by suitability for your client&apos;s needs and income.
          The recommended cover amount is{" "}
          <strong className="text-gray-800">
            {formatZAR(recommendedCover, { showDecimals: false })}
          </strong>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          const tier = TIER_BADGE[rec.product.tier] ?? TIER_BADGE.basic;
          const isTop = rec.isRecommended;

          return (
            <div
              key={rec.product.id}
              className={`relative rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all
                ${isTop
                  ? "border-green-400 shadow-md shadow-green-100"
                  : "border-gray-200 hover:border-gray-300"
                }
                ${selectedId === rec.product.id ? "ring-2 ring-green-500" : ""}
              `}
            >
              {/* Recommended badge */}
              {isTop && (
                <div className="absolute -top-3 left-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    <Star className="w-3 h-3 fill-white" />
                    Recommended
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-2 mt-1">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    {rec.product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.product.insurer}</p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tier.cls}`}
                >
                  {tier.label}
                </span>
              </div>

              {/* Score bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, rec.score)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">
                  Score: {rec.score}/100
                </span>
              </div>

              {/* Key features */}
              <ul className="flex flex-col gap-1.5">
                {rec.product.features.slice(0, 4).map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* Notes / warnings */}
              {rec.notes.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  {rec.notes.map((n, i) => (
                    <p key={i} className="text-xs text-amber-700">
                      {n}
                    </p>
                  ))}
                </div>
              )}

              {/* Premium & action */}
              <div className="flex items-center justify-between gap-4 mt-auto pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">Est. monthly premium</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatZAR(rec.estimatedMonthlyPremium)}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => handleSelect(rec)}
                  className={
                    isTop
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-800 hover:bg-gray-900 text-white"
                  }
                >
                  Select
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {products.length > 4 && (
        <p className="text-xs text-gray-400 text-center">
          Showing top 4 of {products.length} available products based on suitability.
        </p>
      )}
    </div>
  );
}
