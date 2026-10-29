import type { ReactNode } from "react";
import { Section } from "react-email";
import { toneMap } from "../tokens";
import type { EmailTone } from "../types";

interface EmailPanelProps {
  label?: string;
  title?: string;
  description?: string;
  tone?: EmailTone;
  marker?: string;
  children?: ReactNode;
}

export function EmailPanel({ label, title, description, tone = "default", marker = "email-panel", children }: EmailPanelProps) {
  const colors = toneMap[tone];

  return (
    <Section
      className="email-panel"
      data-email-block={marker}
      data-marker={marker}
      style={{
        width: "100%",
        margin: "0 0 14px",
        border: `1px solid ${colors.border}`,
        borderRadius: "20px",
        background: "#ffffff",
        overflow: "hidden",
        padding: "16px 20px",
      }}
    >
      {label ? (
        <div style={{ marginBottom: "10px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              background: colors.accentSoft,
              borderRadius: "100px",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: colors.accentText,
            }}
          >
            {label}
          </span>
        </div>
      ) : null}
      {title ? <div style={{ fontSize: "15px", lineHeight: 1.45, fontWeight: 800, color: "#0f172a" }}>{title}</div> : null}
      {description ? (
        <div style={{ marginTop: "7px", fontSize: "13px", lineHeight: 1.65, color: "#475569" }}>{description}</div>
      ) : null}
      {children ? <div style={{ marginTop: "12px" }}>{children}</div> : null}
    </Section>
  );
}
