import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import { SPRING_GENTLE, ENTRANCE_Y, STAGGER_DELAY } from "@/lib/animation";

export function EmptyFriends() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <motion.span
        initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING_GENTLE, delay: 0 }}
        className="text-5xl mb-4"
        role="img"
        aria-label="friends"
      >
        🤝
      </motion.span>
      <motion.h3
        initial={reducedMotion ? false : { opacity: 0, y: ENTRANCE_Y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: STAGGER_DELAY }}
        className="text-lg font-semibold mb-1"
      >
        {t("emptyState.friends.title", { defaultValue: "No friends added yet" })}
      </motion.h3>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, y: ENTRANCE_Y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: STAGGER_DELAY * 2 }}
        className="text-sm text-muted-foreground mb-6 max-w-xs"
      >
        {t("emptyState.friends.description", {
          defaultValue: "Add friends to start splitting expenses together.",
        })}
      </motion.p>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: ENTRANCE_Y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: STAGGER_DELAY * 3 }}
      >
        <Button asChild>
          <Link to="/friends">
            {t("emptyState.friends.cta", { defaultValue: "Add a friend" })}
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
