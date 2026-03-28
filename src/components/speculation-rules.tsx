import React, { memo } from "react";
import { useSpeculationRules } from "../hooks/use-speculation-rules";

const SpeculationRules = memo(function SpeculationRules() {
  const rules = useSpeculationRules();

  if (!rules) return null;

  return (
    <script
      key={rules}
      type="speculationrules"
      dangerouslySetInnerHTML={{ __html: rules }}
    />
  );
});

export { SpeculationRules };
