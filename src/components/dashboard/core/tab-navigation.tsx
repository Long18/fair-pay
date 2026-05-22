import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";

interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const TabNavigation = ({ tabs, activeTab, onTabChange }: TabNavigationProps) => {
  const { tap } = useHaptics();
  const reducedMotion = useReducedMotion();
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { tap(); onTabChange(tab.id); }}
            className={cn(
              "pb-4 px-1 text-base font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              reducedMotion ? (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 rounded-t-full" />
              ) : (
                <motion.div
                  layoutId="dashboard-nav-indicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 rounded-t-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};
