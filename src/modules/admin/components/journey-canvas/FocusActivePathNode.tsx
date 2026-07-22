import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  JOURNEY_FOCUS_ZOOM,
  JOURNEY_NODE_HEIGHT,
  JOURNEY_NODE_WIDTH,
} from "./journey-layout-constants";

interface FocusActivePathNodeProps {
  activePagePath: string | null;
  activeStepIndex: number;
}

export function FocusActivePathNode({ activePagePath, activeStepIndex }: FocusActivePathNodeProps) {
  const { setCenter, fitView, getNode } = useReactFlow();
  const initialFitDoneRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const centerOnActive = () => {
        if (!activePagePath) {
          void fitView({ duration: 320, padding: 0.22 });
          return;
        }

        const node = getNode(activePagePath);
        if (!node) {
          void fitView({
            nodes: [{ id: activePagePath }],
            duration: 480,
            padding: 0.55,
            maxZoom: JOURNEY_FOCUS_ZOOM,
          });
          return;
        }

        const width = node.measured?.width ?? JOURNEY_NODE_WIDTH;
        const height = node.measured?.height ?? JOURNEY_NODE_HEIGHT;

        void setCenter(node.position.x + width / 2, node.position.y + height / 2, {
          zoom: JOURNEY_FOCUS_ZOOM,
          duration: initialFitDoneRef.current ? 520 : 360,
        });
      };

      if (!initialFitDoneRef.current) {
        initialFitDoneRef.current = true;
      }

      centerOnActive();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [activePagePath, activeStepIndex, fitView, getNode, setCenter]);

  return null;
}
