"use client";

import { useRef, useState, useEffect } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// Dynamic import for SSR safety
import type SignatureCanvasType from "react-signature-canvas";

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  label?: string;
  width?: number;
  height?: number;
}

export default function SignatureCanvas({
  onSave,
  label = "Signature",
  width = 600,
  height = 200,
}: SignatureCanvasProps) {
  const sigCanvasRef = useRef<SignatureCanvasType | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [SigCanvas, setSigCanvas] = useState<typeof SignatureCanvasType | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import to avoid SSR issues
    import("react-signature-canvas").then((mod) => {
      setSigCanvas(() => mod.default);
    });
  }, []);

  function handleEnd() {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      setIsSigned(true);
      const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
      onSave(dataUrl);
    }
  }

  function handleClear() {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setIsSigned(false);
      onSave("");
    }
  }

  if (!isClient || !SigCanvas) {
    return (
      <div className="flex flex-col gap-2">
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg bg-white flex items-center justify-center"
          style={{ width: "100%", height: `${height}px` }}
        >
          <span className="text-gray-400 text-sm">Loading signature pad...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
        {!isSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-300 text-sm select-none">Sign here</span>
          </div>
        )}
        <SigCanvas
          ref={sigCanvasRef}
          onEnd={handleEnd}
          canvasProps={{
            width: width,
            height: height,
            className: "w-full",
            style: { touchAction: "none" },
          }}
          backgroundColor="rgba(255,255,255,0)"
          penColor="#1a1a1a"
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="flex items-center gap-1.5 text-gray-600 border-gray-300 hover:bg-gray-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </Button>
        {isSigned && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Signature captured
          </div>
        )}
      </div>
    </div>
  );
}
