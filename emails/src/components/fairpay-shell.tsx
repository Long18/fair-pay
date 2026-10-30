import type { ReactNode } from "react";
import { Body, Button, Container, Head, Html, Preview, Section, Text } from "react-email";
import { FONT_STACK, TRANSACTIONAL_COLORS, TRANSACTIONAL_RESPONSIVE_CSS } from "../tokens";

interface FairPayShellProps {
  title: string;
  previewText: string;
  ctaHref: string;
  ctaLabel: string;
  /** Rendered under the CTA divider; use `TransactionalFooter`. */
  footer: ReactNode;
  /** Small print directly under the CTA (e.g. a plain-URL fallback). */
  afterCta?: ReactNode;
  children: ReactNode;
}

function EmailDocument({ title, previewText, children }: { title: string; previewText: string; children: ReactNode }) {
  return (
    <Html lang="vi">
      <Head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: TRANSACTIONAL_RESPONSIVE_CSS }} />
      </Head>
      <Preview useTitleTag={false}>{previewText}</Preview>
      {children}
    </Html>
  );
}

/** Single-column transactional layout: text wordmark, body, one CTA, footer. No images. */
export function FairPayShell({ title, previewText, ctaHref, ctaLabel, footer, afterCta, children }: FairPayShellProps) {
  const colors = TRANSACTIONAL_COLORS;

  return (
    <EmailDocument title={title} previewText={previewText}>
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
              {afterCta}
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
