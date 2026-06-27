import { useEffect, useState } from "react";
import { ChevronUpIcon } from "lucide-react";
import { FloatingActionStack, FloatingPill } from "@/components/ui/floating-stack";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  // Left-side stack so it doesn't collide with the right-side primary FAB stack
  return (
    <FloatingActionStack
      side="left"
      trigger={
        <FloatingPill
          size="sm"
          icon={<ChevronUpIcon className="h-4 w-4" />}
          ariaLabel="Scroll to top"
          onClick={scrollToTop}
        />
      }
    />
  );
}
