import { createContext, useContext, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const GSAPContext = createContext<{ gsap: typeof gsap } | null>(null);

export function GSAPProvider({ children }: { children: ReactNode }) {
  useGSAP(() => {
    // Refresh ScrollTrigger on route changes
    ScrollTrigger.refresh();
  });

  return (
    <GSAPContext.Provider value={{ gsap }}>
      {children}
    </GSAPContext.Provider>
  );
}

export function useGSAPContext() {
  const context = useContext(GSAPContext);
  if (!context) {
    throw new Error("useGSAPContext must be used within a GSAPProvider");
  }
  return context;
}
