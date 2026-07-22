import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";

interface FocusActivePathNodeProps {
  activePagePath: string | null;
  activeStepIndex: number;
}

export function FocusActivePathNode({ activePagePath, activeStepIndex }: FocusActivePathNodeProps) {
  const { fitView } = useReactFlow();
  const initialFitDoneRef = useRef(false);

  useEffect(() => {
    if (!activePagePath) return;

    const timer = window.setTimeout(() => {
      if (!initialFitDoneRef.current) {
        initialFitDoneRef.current = true;
        void fitView({ duration: 300, padding: 0.25 });
        return;
      }

      void fitView({
        nodes: [{ id: activePagePath }],
        duration: 450,
        padding: 0.45,
        maxZoom: 1.05,
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [activePagePath, activeStepIndex, fitView]);

  return null;
}
