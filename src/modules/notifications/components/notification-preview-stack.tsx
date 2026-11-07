import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { SPRING_GENTLE } from "@/lib/motion/tokens";
import { NotificationPreviewCard } from "./notification-preview-card";
import type { NotificationPreviewDetail } from "../utils/notification-preview-events";

export type NotificationPreviewStackItem = NotificationPreviewDetail & { key: string };

const STACK_LAYOUT_SPRING = {
  ...SPRING_GENTLE,
  stiffness: 400,
  damping: 24,
  mass: 0.78,
};

const STACK_ENTER_SPRING = {
  ...SPRING_GENTLE,
  stiffness: 460,
  damping: 26,
  mass: 0.72,
};

type Props = {
  items: NotificationPreviewStackItem[];
  reducedMotion: boolean;
  onActivate: (item: NotificationPreviewStackItem) => void;
  onDismiss: (key: string) => void;
};

export function NotificationPreviewStack({
  items,
  reducedMotion,
  onActivate,
  onDismiss,
}: Props) {
  return (
    <LayoutGroup id="fairpay-notification-preview-stack">
      <motion.div layoutRoot className="relative flex w-full flex-col justify-end">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <motion.div
                key={item.key}
                layout={!reducedMotion}
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: -48, scale: 0.98 }
                }
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  marginBottom: isLast ? 0 : 8,
                }}
                exit={
                  reducedMotion
                    ? { opacity: 0, marginBottom: 0, transition: { duration: 0.12 } }
                    : {
                        opacity: 0,
                        x: 36,
                        scale: 0.96,
                        marginBottom: 0,
                        transition: {
                          x: { type: "spring", stiffness: 520, damping: 32 },
                          opacity: { duration: 0.16 },
                          scale: { duration: 0.18 },
                          marginBottom: STACK_LAYOUT_SPRING,
                        },
                      }
                }
                transition={{
                  layout: reducedMotion ? { duration: 0.12 } : STACK_LAYOUT_SPRING,
                  opacity: { duration: reducedMotion ? 0.12 : 0.22 },
                  x: reducedMotion ? { duration: 0.12 } : STACK_ENTER_SPRING,
                  scale: reducedMotion ? { duration: 0.12 } : STACK_LAYOUT_SPRING,
                  marginBottom: reducedMotion ? { duration: 0.12 } : STACK_LAYOUT_SPRING,
                }}
                className="pointer-events-auto overflow-visible"
              >
                <NotificationPreviewCard
                  detail={item}
                  onActivate={() => onActivate(item)}
                  onDismiss={() => onDismiss(item.key)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
