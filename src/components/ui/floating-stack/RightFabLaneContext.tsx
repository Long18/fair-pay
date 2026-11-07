import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type RightFabLaneContextValue = {
  /** Desktop dashboard CreateMenu (primary lane) is expanded. */
  primaryQuickActionsOpen: boolean;
  setPrimaryQuickActionsOpen: (open: boolean) => void;
};

const RightFabLaneContext = createContext<RightFabLaneContextValue | null>(null);

export function RightFabLaneProvider({ children }: PropsWithChildren) {
  const [primaryQuickActionsOpen, setOpen] = useState(false);
  const setPrimaryQuickActionsOpen = useCallback((open: boolean) => {
    setOpen(open);
  }, []);

  const value = useMemo(
    () => ({ primaryQuickActionsOpen, setPrimaryQuickActionsOpen }),
    [primaryQuickActionsOpen, setPrimaryQuickActionsOpen],
  );

  return (
    <RightFabLaneContext.Provider value={value}>{children}</RightFabLaneContext.Provider>
  );
}

export function useRightFabLane(): RightFabLaneContextValue {
  const ctx = useContext(RightFabLaneContext);
  if (!ctx) {
    return {
      primaryQuickActionsOpen: false,
      setPrimaryQuickActionsOpen: () => undefined,
    };
  }
  return ctx;
}
