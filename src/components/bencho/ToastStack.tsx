import { type CSSProperties, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { benchoTokenStyle } from "./bencho-token-vars";

/* ══ Toast stack (bencho.dev/?c=toast-stack) ═══════════════════
   Controlled stack: parent passes up to three toasts, newest first.
   Motion / frame / hover-open match the Bencho lab component. */

export type ToastKind = "success" | "info" | "error" | "warning";

export type BenchoToast = {
  id: string;
  kind: ToastKind;
  title: string;
  body: string;
  action?: string;
};

const ICON: Record<ToastKind, LucideIcon> = {
  success: CircleCheck,
  info: Info,
  error: CircleX,
  warning: TriangleAlert,
};

const W = 300;
const H = 64;
const SHOWN = 3;
const SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 1 } as const;

type Props = {
  /** Newest toast first (front of stack). */
  stack: BenchoToast[];
  className?: string;
  peek?: number;
  gap?: number;
  corner?: number;
  reducedMotion?: boolean;
  onDismiss: (id: string) => void;
  onActivate?: (id: string) => void;
  onAction?: (id: string) => void;
};

export function ToastStack({
  stack,
  className,
  peek = 14,
  gap = 10,
  corner = 20,
  reducedMotion = false,
  onDismiss,
  onActivate,
  onAction,
}: Props) {
  const visible = stack.slice(0, SHOWN);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);

  if (visible.length === 0) return null;

  const listH = SHOWN * H + (SHOWN - 1) * gap;
  const stackH = H + (SHOWN - 1) * peek;
  const frameH = listH;

  const place = (k: number) => {
    if (open && !reducedMotion) {
      const top = (frameH - listH) / 2;
      return { y: top + (SHOWN - 1 - k) * (H + gap), scale: 1 };
    }
    const top = (frameH - stackH) / 2;
    const d = Math.min(k, visible.length - 1);
    return { y: top + (visible.length - 1 - d) * peek, scale: 1 - d * 0.05 };
  };

  const dismiss = (id: string) => {
    if (leaving !== null) return;
    setLeaving(id);
    window.setTimeout(() => {
      onDismiss(id);
      setLeaving(null);
    }, 220);
  };

  return (
    <div
      ref={root}
      className={cn("tst", className)}
      role="region"
      aria-label="Notifications"
      data-open={open || undefined}
      style={
        {
          ...benchoTokenStyle,
          width: W,
          height: frameH,
          ["--tst-r" as string]: `${corner}px`,
        } as CSSProperties
      }
      onPointerOver={() => !reducedMotion && setOpen(true)}
      onPointerOut={(e) => {
        const to = e.relatedTarget as Node | null;
        if (!to || !root.current?.contains(to)) setOpen(false);
      }}
      onFocus={() => !reducedMotion && setOpen(true)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {visible.map((t, k) => {
        const Icon = ICON[t.kind];
        const out = leaving === t.id;
        const p = place(k);
        const front = k === 0;
        return (
          <motion.div
            key={t.id}
            className="tst-toast"
            data-kind={t.kind}
            data-front={front || undefined}
            style={{ height: H, zIndex: SHOWN - k }}
            initial={
              reducedMotion
                ? false
                : { y: place(0).y + 24, scale: 1, opacity: 0, x: 0 }
            }
            animate={
              out
                ? { y: p.y, scale: p.scale, opacity: 0, x: 60 }
                : { y: p.y, scale: p.scale, opacity: 1, x: 0 }
            }
            transition={
              out
                ? { duration: 0.22, ease: [0.4, 0, 1, 1] }
                : reducedMotion
                  ? { duration: 0.15 }
                  : SPRING
            }
            aria-hidden={!open && !front ? true : undefined}
          >
            <button
              type="button"
              className="tst-hit"
              tabIndex={open || front ? 0 : -1}
              onClick={() => onActivate?.(t.id)}
            >
              <span className="tst-icon">
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="tst-text">
                <b>{t.title}</b>
                <span>{t.body}</span>
              </span>
            </button>
            {t.action ? (
              <button
                type="button"
                className="tst-act"
                tabIndex={open || front ? 0 : -1}
                onClick={() => onAction?.(t.id)}
              >
                {t.action}
              </button>
            ) : null}
            <button
              type="button"
              className="tst-x"
              aria-label={`Dismiss ${t.title}`}
              tabIndex={open || front ? 0 : -1}
              onClick={() => dismiss(t.id)}
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
