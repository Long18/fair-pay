import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShareSheet } from "./ShareSheet";
import { formatCurrency } from "@/lib/locale-utils";

interface SettlementCelebrationProps {
  open: boolean;
  onClose: () => void;
  debtorName: string;
  amount: number;
  currency?: string;
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotate: number;
}

const CONFETTI_COLORS = [
  "#f43f5e",
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
];

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 1.8 + Math.random() * 1.2,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.floor(Math.random() * 6),
    rotate: Math.floor(Math.random() * 360),
  }));
}

const CONFETTI_PIECES = generateConfetti(30);

const CONFETTI_KEYFRAMES = `
@keyframes confetti-fall {
  0% { transform: translateY(-20px) rotate(var(--confetti-rot)); opacity: 1; }
  100% { transform: translateY(260px) rotate(calc(var(--confetti-rot) + 360deg)); opacity: 0; }
}
`;

export function SettlementCelebration({
  open,
  onClose,
  debtorName,
  amount,
  currency = "VND",
}: SettlementCelebrationProps) {
  const { t } = useTranslation();
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!styleRef.current) {
      const style = document.createElement("style");
      style.textContent = CONFETTI_KEYFRAMES;
      document.head.appendChild(style);
      styleRef.current = style;
    }
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);

  const shareUrl = window.location.href;
  const shareTitle = t("celebration.shareMessage", "I just settled a debt on FairPay! 🎉");
  const formattedAmount = formatCurrency(amount, currency);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm overflow-hidden gap-0 p-0">
        {/* Confetti container */}
        {open ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden"
            aria-hidden
          >
            {CONFETTI_PIECES.map((piece) => (
              <div
                key={piece.id}
                style={{
                  position: "absolute",
                  left: `${piece.left}%`,
                  top: 0,
                  width: piece.size,
                  height: piece.size,
                  backgroundColor: piece.color,
                  borderRadius: 2,
                  animation: `confetti-fall ${piece.duration}s ${piece.delay}s ease-in forwards`,
                  ["--confetti-rot" as string]: `${piece.rotate}deg`,
                }}
              />
            ))}
          </div>
        ) : null}

        <DialogHeader className="px-6 pb-2 pt-8 text-center">
          <DialogTitle className="text-center text-xl font-bold">
            {t("celebration.title", "Debt settled! 🎉")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 px-6 pb-6 pt-2">
          <p className="text-center text-muted-foreground text-sm">
            {t("celebration.subtitle", "{{amount}} settled with {{name}}", {
              amount: formattedAmount,
              name: debtorName,
            })}
          </p>

          <div className="flex w-full flex-col gap-2">
            <ShareSheet
              url={shareUrl}
              title={shareTitle}
              trigger={
                <Button className="w-full" variant="default">
                  {t("celebration.share", "Share the good news")}
                </Button>
              }
            />
            <Button variant="outline" className="w-full" onClick={onClose}>
              {t("common.close", "Close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
