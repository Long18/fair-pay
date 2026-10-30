/** Neutral palette; brand is FairPay sky-600 so white CTA text keeps AA contrast. */
export const TRANSACTIONAL_COLORS = {
  page: "#f4f7fb",
  border: "#e2e8f0",
  text: "#0f172a",
  secondary: "#64748b",
  brand: "#0284c7",
};

export const FONT_STACK = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";

export const TRANSACTIONAL_RESPONSIVE_CSS = `
@media only screen and (max-width: 640px) {
  .email-shell { padding: 10px 6px !important; }
  .email-card-tx { padding: 16px !important; border-radius: 12px !important; }
  .cta-link { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
}`;
