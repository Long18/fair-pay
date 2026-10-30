import type { ReactNode } from "react";
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "react-email";
import { FONT_STACK, RESPONSIVE_CSS, TRANSACTIONAL_COLORS, TRANSACTIONAL_RESPONSIVE_CSS, toneMap } from "../tokens";
import type { EmailTone } from "../types";
import { RichText } from "./rich-text";

interface LegacyShellProps {
  variant?: "legacy";
  title: string;
  previewText: string;
  eyebrow: string;
  heading: string;
  subheading?: string;
  ctaHref: string;
  ctaLabel: string;
  footerHtml: string;
  tone?: EmailTone;
  hero?: ReactNode;
  children: ReactNode;
}

interface TransactionalShellProps {
  variant: "transactional";
  title: string;
  previewText: string;
  ctaHref: string;
  ctaLabel: string;
  /** Rendered under the CTA divider; use `TransactionalFooter`. */
  footer: ReactNode;
  children: ReactNode;
}

type FairPayShellProps = LegacyShellProps | TransactionalShellProps;

const footerTagStyles = {
  p: "margin:0;font-size:11px;line-height:1.8;color:#94a3b8;",
  strong: "color:#64748b;",
};

export function FairPayShell(props: FairPayShellProps) {
  return props.variant === "transactional" ? <TransactionalShell {...props} /> : <LegacyShell {...props} />;
}

function EmailDocument({
  title,
  previewText,
  css,
  children,
}: {
  title: string;
  previewText: string;
  css: string;
  children: ReactNode;
}) {
  return (
    <Html lang="vi">
      <Head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </Head>
      <Preview useTitleTag={false}>{previewText}</Preview>
      {children}
    </Html>
  );
}

function TransactionalShell({ title, previewText, ctaHref, ctaLabel, footer, children }: TransactionalShellProps) {
  const colors = TRANSACTIONAL_COLORS;

  return (
    <EmailDocument title={title} previewText={previewText} css={TRANSACTIONAL_RESPONSIVE_CSS}>
      <Body lang="vi" style={{ margin: 0, padding: 0, background: colors.page, fontFamily: FONT_STACK, color: colors.text }}>
        <Section className="email-shell" data-email-shell="fairpay-transactional" style={{ width: "100%", background: colors.page, padding: "24px 12px" }}>
          <Container
            className="email-card-tx"
            style={{
              width: "100%",
              maxWidth: "600px",
              background: "#ffffff",
              border: `1px solid ${colors.border}`,
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <Text data-email-block="wordmark" style={{ margin: "0 0 20px", fontSize: "15px", lineHeight: "20px", fontWeight: 800, color: colors.brand }}>
              FairPay
            </Text>
            {children}
            <Section style={{ marginTop: "24px" }}>
              <Button
                className="cta-link"
                href={ctaHref}
                style={{
                  display: "inline-block",
                  boxSizing: "border-box",
                  minHeight: "48px",
                  borderRadius: "12px",
                  background: colors.brand,
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: "15px",
                  lineHeight: "18px",
                  fontWeight: 700,
                  padding: "15px 28px",
                  textAlign: "center",
                }}
              >
                {ctaLabel}
              </Button>
            </Section>
            <Section data-email-block="footer" style={{ marginTop: "24px", paddingTop: "16px", borderTop: `1px solid ${colors.border}` }}>
              {footer}
            </Section>
          </Container>
        </Section>
      </Body>
    </EmailDocument>
  );
}

export function TransactionalFooter({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <Text key={line} style={{ margin: 0, fontSize: "12px", lineHeight: "18px", color: TRANSACTIONAL_COLORS.secondary }}>
          {line}
        </Text>
      ))}
    </>
  );
}

function LegacyShell({
  title,
  previewText,
  eyebrow,
  heading,
  subheading,
  ctaHref,
  ctaLabel,
  footerHtml,
  tone = "default",
  hero,
  children,
}: LegacyShellProps) {
  const colors = toneMap[tone];

  return (
    <EmailDocument title={title} previewText={previewText} css={RESPONSIVE_CSS}>
      <Body lang="vi" style={{ margin: 0, padding: 0, background: "#f4f7fb", fontFamily: FONT_STACK, color: "#1e293b" }}>
        <Section
          className="email-shell"
          data-email-shell="fairpay-pastel"
          style={{ width: "100%", background: "#f4f7fb", padding: "32px 12px" }}
        >
          <Container
            className="email-card"
            style={{
              width: "100%",
              maxWidth: "640px",
              background: "#ffffff",
              border: "1px solid #e2ecf4",
              borderRadius: "28px",
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(15,23,42,0.07),0 1px 4px rgba(15,23,42,0.04)",
            }}
          >
            <Section
              className="email-brand"
              style={{
                padding: "30px 32px 26px",
                backgroundColor: colors.accentSoft,
                backgroundImage: `linear-gradient(150deg,${colors.accentSoft} 0%,#ffffff 100%)`,
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ marginBottom: "14px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 14px",
                    background: colors.accent,
                    borderRadius: "100px",
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 800,
                    color: "#ffffff",
                  }}
                >
                  {eyebrow}
                </span>
              </div>
              <Heading
                as="h1"
                className="email-heading"
                style={{ margin: 0, fontSize: "26px", lineHeight: 1.2, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}
              >
                {heading}
              </Heading>
              {subheading ? (
                <Text style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.7, color: "#475569" }}>{subheading}</Text>
              ) : null}
            </Section>
            {hero}
            <Section className="email-body" style={{ padding: "28px 32px 32px" }}>
              {children}
              <Section style={{ marginTop: "26px" }}>
                <Button
                  className="cta-link"
                  href={ctaHref}
                  style={{
                    display: "inline-block",
                    borderRadius: "100px",
                    background: colors.accent,
                    color: "#ffffff",
                    textDecoration: "none",
                    fontSize: "15px",
                    lineHeight: 1.2,
                    fontWeight: 800,
                    padding: "14px 28px",
                    textAlign: "center",
                  }}
                >
                  {ctaLabel}
                </Button>
              </Section>
            </Section>
          </Container>
          <div style={{ maxWidth: "640px", margin: "16px auto 0", padding: "0 4px", textAlign: "left" }}>
            <RichText html={footerHtml} tagStyles={footerTagStyles} data-email-block="footer" />
          </div>
        </Section>
      </Body>
    </EmailDocument>
  );
}
