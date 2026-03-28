export type ThemeIntent =
  | "brand"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "chart2"
  | "chart5";

export type ThemeIntentTone = {
  surface: string;
  border: string;
  text: string;
  icon: string;
  chartColor: string;
};

export const themeIntentTones: Record<ThemeIntent, ThemeIntentTone> = {
  brand: {
    surface: "bg-primary/10",
    border: "border-primary/20",
    text: "text-primary",
    icon: "text-primary",
    chartColor: "var(--primary)",
  },
  accent: {
    surface: "bg-accent/10",
    border: "border-accent/20",
    text: "text-accent",
    icon: "text-accent",
    chartColor: "var(--accent)",
  },
  info: {
    surface: "bg-status-info-bg",
    border: "border-status-info-border",
    text: "text-status-info-foreground",
    icon: "text-status-info",
    chartColor: "var(--status-info)",
  },
  success: {
    surface: "bg-status-success-bg",
    border: "border-status-success-border",
    text: "text-status-success-foreground",
    icon: "text-semantic-positive",
    chartColor: "var(--chart-positive)",
  },
  warning: {
    surface: "bg-status-warning-bg",
    border: "border-status-warning-border",
    text: "text-status-warning-foreground",
    icon: "text-status-warning",
    chartColor: "var(--status-warning)",
  },
  danger: {
    surface: "bg-status-error-bg",
    border: "border-status-error-border",
    text: "text-status-error-foreground",
    icon: "text-semantic-negative",
    chartColor: "var(--chart-negative)",
  },
  neutral: {
    surface: "bg-muted",
    border: "border-border",
    text: "text-foreground",
    icon: "text-muted-foreground",
    chartColor: "var(--muted-foreground)",
  },
  chart2: {
    surface: "bg-chart-2/12",
    border: "border-chart-2/20",
    text: "text-chart-2",
    icon: "text-chart-2",
    chartColor: "var(--chart-2)",
  },
  chart5: {
    surface: "bg-chart-5/12",
    border: "border-chart-5/20",
    text: "text-chart-5",
    icon: "text-chart-5",
    chartColor: "var(--chart-5)",
  },
};
