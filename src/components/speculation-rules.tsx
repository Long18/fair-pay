import { useEffect } from "react";
import { useSpeculationRules } from "../hooks/use-speculation-rules";

function SpeculationRules() {
  const rules = useSpeculationRules();

  useEffect(() => {
    if (!rules) return;

    // dangerouslySetInnerHTML uses the innerHTML setter, which browsers silently
    // reject for <script type="speculationrules">. Imperative DOM creation with
    // textContent is the only way to inject dynamic speculation rules.
    const script = document.createElement("script");
    script.type = "speculationrules";
    script.textContent = rules;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [rules]);

  return null;
}

export { SpeculationRules };
