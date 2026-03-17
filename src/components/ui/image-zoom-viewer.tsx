import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomInIcon, ZoomOutIcon, RotateCcwIcon } from "@/components/ui/icons";

interface ImageZoomViewerProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export function ImageZoomViewer({
  src,
  alt,
  open,
  onClose,
  title,
  footer,
}: ImageZoomViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionAtDragStart = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);

  // Pinch tracking
  const activePointers = useRef<Map<number, { x: number; y: number }>>(
    new Map()
  );
  const initialPinchDistance = useRef<number | null>(null);
  const scaleAtPinchStart = useRef(1);

  const clampPosition = useCallback(
    (x: number, y: number, currentScale: number) => {
      if (!containerRef.current) return { x, y };
      const rect = containerRef.current.getBoundingClientRect();
      const maxX = (rect.width * (currentScale - 1)) / 2;
      const maxY = (rect.height * (currentScale - 1)) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    []
  );

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Prevent wheel scroll on the container when zoomed
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      setScale((prev) => {
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta));
        if (next === MIN_SCALE) setPosition({ x: 0, y: 0 });
        return next;
      });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [open]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

      if (activePointers.current.size === 2) {
        // Start pinch
        const [a, b] = Array.from(activePointers.current.values());
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
        scaleAtPinchStart.current = scale;
        isDragging.current = false;
      } else if (activePointers.current.size === 1) {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        positionAtDragStart.current = { ...position };
      }
    },
    [position, scale]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.current.size === 2 && initialPinchDistance.current !== null) {
        const [a, b] = Array.from(activePointers.current.values());
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const ratio = currentDistance / initialPinchDistance.current;
        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, scaleAtPinchStart.current * ratio)
        );
        setScale(newScale);
        if (newScale === MIN_SCALE) setPosition({ x: 0, y: 0 });
        return;
      }

      if (isDragging.current && scale > 1 && activePointers.current.size === 1) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const rawX = positionAtDragStart.current.x + dx;
        const rawY = positionAtDragStart.current.y + dy;
        setPosition(clampPosition(rawX, rawY, scale));
      }
    },
    [scale, clampPosition]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointers.current.delete(e.pointerId);

      if (activePointers.current.size < 2) {
        initialPinchDistance.current = null;
      }
      if (activePointers.current.size === 0) {
        isDragging.current = false;
      }
    },
    []
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (scale > 1) {
        handleReset();
      } else {
        // Zoom to 2.5x centered on click point
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const cx = e.clientX - rect.left - rect.width / 2;
          const cy = e.clientY - rect.top - rect.height / 2;
          const newScale = 2.5;
          const newPos = clampPosition(-cx * (newScale - 1), -cy * (newScale - 1), newScale);
          setScale(newScale);
          setPosition(newPos);
        }
      }
    },
    [scale, handleReset, clampPosition]
  );

  // Mobile double-tap via pointer events
  const handleTouchTap = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointers.current.size > 1) return;
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        // Double tap
        if (scale > 1) {
          handleReset();
        } else {
          setScale(2.5);
        }
      }
      lastTapTime.current = now;
    },
    [scale, handleReset]
  );

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        handleReset();
        onClose();
      }
    },
    [onClose, handleReset]
  );

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(MIN_SCALE, prev - 0.5);
      if (next === MIN_SCALE) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, prev + 0.5));
  }, []);

  const isZoomed = scale > 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 shrink-0">
          <DialogTitle>{title ?? alt}</DialogTitle>
        </DialogHeader>

        {/* Image container */}
        <div
          ref={containerRef}
          className={`overflow-hidden bg-muted flex-1 relative select-none ${
            isZoomed
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-zoom-in"
          }`}
          style={{ touchAction: isZoomed ? "none" : "auto", willChange: "transform" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          onPointerDownCapture={handleTouchTap}
        >
          <motion.img
            src={src}
            alt={alt}
            draggable={false}
            className="w-full h-full object-contain pointer-events-none"
            style={{
              willChange: "transform",
              x: position.x,
              y: position.y,
              scale,
            }}
            animate={{
              x: position.x,
              y: position.y,
              scale,
            }}
            transition={SPRING}
          />
        </div>

        {/* Controls toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-t">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
          >
            <ZoomOutIcon size={18} />
          </Button>

          <span className="text-sm tabular-nums w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
          >
            <ZoomInIcon size={18} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            disabled={!isZoomed}
            aria-label="Reset zoom"
          >
            <RotateCcwIcon size={18} />
          </Button>

          {footer && (
            <div className="ml-auto flex items-center gap-2">{footer}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
