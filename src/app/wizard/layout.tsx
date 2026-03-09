"use client";

import { useRouter } from "next/navigation";
import { Shield, LogOut } from "lucide-react";
import { useWizardStore } from "@/lib/store/wizard.store";
import { Button } from "@/components/ui/button";

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const resetWizard = useWizardStore((s) => s.resetWizard);

  function handleSaveAndExit() {
    resetWizard();
    router.push("/");
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top header bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="font-bold text-gray-900">Funeral Cover Studio</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAndExit}
            className="flex items-center gap-1.5 text-gray-600 border-gray-300 hover:bg-gray-50 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Save &amp; Exit
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4">
        {children}
      </div>
    </div>
  );
}
