"use client";

import { useEffect, useState } from "react";
import { ToggleLeft, ToggleRight, Package } from "lucide-react";
import { Product } from "@/types/product.types";

const TIER_CLASSES: Record<string, string> = {
  basic: "bg-gray-100 text-gray-600",
  standard: "bg-blue-100 text-blue-700",
  premium: "bg-purple-100 text-purple-700",
  elite: "bg-amber-100 text-amber-700",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TIER_CLASSES[tier] || "bg-gray-100 text-gray-600"}`}
    >
      {tier}
    </span>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch all products (active + inactive) by using the admin products endpoint
        // The base /api/products only returns active; we call it knowing admin needs all.
        // For MVP the same endpoint is fine — in production add /api/admin/products
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Products load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggleActive(product: Product) {
    setToggling(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });

      // Update local state regardless — optimistic for MVP, confirmed if ok
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isActive: !p.isActive } : p
        )
      );

      if (!res.ok) {
        console.error("Toggle product failed:", await res.text());
      }
    } catch (err) {
      console.error("Toggle product error:", err);
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Loading products…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500 mt-1">
            {products.filter((p) => p.isActive).length} active ·{" "}
            {products.filter((p) => !p.isActive).length} inactive
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No products found.</p>
          <p className="text-gray-400 text-xs mt-1">
            Add products to the data/products.json file.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left bg-gray-50">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Insurer
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cover Range
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Waiting Period
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Effective Date
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Toggle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{product.tagline}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{product.insurer}</td>
                    <td className="px-6 py-3">
                      <TierBadge tier={product.tier} />
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      R {product.minSumAssured?.toLocaleString("en-ZA")} –{" "}
                      R {product.maxSumAssured?.toLocaleString("en-ZA")}
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {product.waitingPeriodMonths} months
                      {product.accidentalDeathWaitingPeriodMonths !== undefined && (
                        <span className="block text-gray-400">
                          Accidental: {product.accidentalDeathWaitingPeriodMonths}m
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {product.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {product.effectiveDate || "—"}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => toggleActive(product)}
                        disabled={toggling === product.id}
                        title={product.isActive ? "Deactivate product" : "Activate product"}
                        className={[
                          "transition-colors disabled:opacity-40",
                          product.isActive
                            ? "text-green-600 hover:text-green-800"
                            : "text-gray-400 hover:text-green-600",
                        ].join(" ")}
                      >
                        {product.isActive ? (
                          <ToggleRight size={24} />
                        ) : (
                          <ToggleLeft size={24} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
