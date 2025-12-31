export type ThemePalette = {
  name: string;
  displayName: string;
  light: ThemeColors;
  dark: ThemeColors;
};

export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

const monokaiProPalette: ThemePalette = {
  name: "monokai-pro",
  displayName: "Monokai Pro",
  light: {
    background: "oklch(0.985 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    cardForeground: "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    popoverForeground: "oklch(0.145 0 0)",
    primary: "oklch(0.646 0.138 192.4)",
    primaryForeground: "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    secondaryForeground: "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    mutedForeground: "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    accentForeground: "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    destructiveForeground: "oklch(0.985 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.646 0.138 192.4)",
    chart1: "oklch(0.646 0.138 192.4)",
    chart2: "oklch(0.6 0.15 280)",
    chart3: "oklch(0.7 0.18 40)",
    chart4: "oklch(0.65 0.15 160)",
    chart5: "oklch(0.75 0.15 80)",
    sidebar: "oklch(0.985 0 0)",
    sidebarForeground: "oklch(0.145 0 0)",
    sidebarPrimary: "oklch(0.646 0.138 192.4)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    sidebarAccent: "oklch(0.97 0 0)",
    sidebarAccentForeground: "oklch(0.205 0 0)",
    sidebarBorder: "oklch(0.922 0 0)",
    sidebarRing: "oklch(0.646 0.138 192.4)",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    cardForeground: "oklch(0.985 0 0)",
    popover: "oklch(0.269 0 0)",
    popoverForeground: "oklch(0.985 0 0)",
    primary: "oklch(0.75 0.15 192.4)",
    primaryForeground: "oklch(0.145 0 0)",
    secondary: "oklch(0.269 0 0)",
    secondaryForeground: "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    mutedForeground: "oklch(0.708 0 0)",
    accent: "oklch(0.6 0.15 280)",
    accentForeground: "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    destructiveForeground: "oklch(0.985 0 0)",
    border: "oklch(0.269 0 0)",
    input: "oklch(0.269 0 0)",
    ring: "oklch(0.75 0.15 192.4)",
    chart1: "oklch(0.75 0.15 192.4)",
    chart2: "oklch(0.65 0.18 280)",
    chart3: "oklch(0.75 0.18 40)",
    chart4: "oklch(0.7 0.15 160)",
    chart5: "oklch(0.8 0.15 80)",
    sidebar: "oklch(0.205 0 0)",
    sidebarForeground: "oklch(0.708 0 0)",
    sidebarPrimary: "oklch(0.75 0.15 192.4)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    sidebarAccent: "oklch(0.269 0 0)",
    sidebarAccentForeground: "oklch(0.985 0 0)",
    sidebarBorder: "oklch(0.269 0 0)",
    sidebarRing: "oklch(0.75 0.15 192.4)",
  },
};

const monokaiClassicPalette: ThemePalette = {
  name: "monokai-classic",
  displayName: "Monokai Classic",
  light: {
    background: "oklch(0.985 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    cardForeground: "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    popoverForeground: "oklch(0.145 0 0)",
    primary: "oklch(0.65 0.19 110)",
    primaryForeground: "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    secondaryForeground: "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    mutedForeground: "oklch(0.556 0 0)",
    accent: "oklch(0.75 0.22 65)",
    accentForeground: "oklch(0.145 0 0)",
    destructive: "oklch(0.62 0.26 25)",
    destructiveForeground: "oklch(0.985 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.65 0.19 110)",
    chart1: "oklch(0.65 0.19 110)",
    chart2: "oklch(0.62 0.26 25)",
    chart3: "oklch(0.75 0.22 65)",
    chart4: "oklch(0.7 0.18 190)",
    chart5: "oklch(0.68 0.21 310)",
    sidebar: "oklch(0.985 0 0)",
    sidebarForeground: "oklch(0.145 0 0)",
    sidebarPrimary: "oklch(0.65 0.19 110)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    sidebarAccent: "oklch(0.97 0 0)",
    sidebarAccentForeground: "oklch(0.205 0 0)",
    sidebarBorder: "oklch(0.922 0 0)",
    sidebarRing: "oklch(0.65 0.19 110)",
  },
  dark: {
    background: "oklch(0.15 0.01 60)",
    foreground: "oklch(0.95 0.01 60)",
    card: "oklch(0.21 0.01 60)",
    cardForeground: "oklch(0.95 0.01 60)",
    popover: "oklch(0.27 0.01 60)",
    popoverForeground: "oklch(0.95 0.01 60)",
    primary: "oklch(0.75 0.19 110)",
    primaryForeground: "oklch(0.15 0.01 60)",
    secondary: "oklch(0.27 0.01 60)",
    secondaryForeground: "oklch(0.95 0.01 60)",
    muted: "oklch(0.27 0.01 60)",
    mutedForeground: "oklch(0.71 0.01 60)",
    accent: "oklch(0.8 0.22 65)",
    accentForeground: "oklch(0.15 0.01 60)",
    destructive: "oklch(0.72 0.26 25)",
    destructiveForeground: "oklch(0.95 0.01 60)",
    border: "oklch(0.27 0.01 60)",
    input: "oklch(0.27 0.01 60)",
    ring: "oklch(0.75 0.19 110)",
    chart1: "oklch(0.75 0.19 110)",
    chart2: "oklch(0.72 0.26 25)",
    chart3: "oklch(0.8 0.22 65)",
    chart4: "oklch(0.75 0.18 190)",
    chart5: "oklch(0.73 0.21 310)",
    sidebar: "oklch(0.21 0.01 60)",
    sidebarForeground: "oklch(0.71 0.01 60)",
    sidebarPrimary: "oklch(0.75 0.19 110)",
    sidebarPrimaryForeground: "oklch(0.95 0.01 60)",
    sidebarAccent: "oklch(0.27 0.01 60)",
    sidebarAccentForeground: "oklch(0.95 0.01 60)",
    sidebarBorder: "oklch(0.27 0.01 60)",
    sidebarRing: "oklch(0.75 0.19 110)",
  },
};

const monokaiMachinePalette: ThemePalette = {
  name: "monokai-machine",
  displayName: "Monokai Machine",
  light: {
    background: "oklch(0.985 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    cardForeground: "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    popoverForeground: "oklch(0.145 0 0)",
    primary: "oklch(0.6 0.15 220)",
    primaryForeground: "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    secondaryForeground: "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    mutedForeground: "oklch(0.556 0 0)",
    accent: "oklch(0.65 0.18 200)",
    accentForeground: "oklch(0.985 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    destructiveForeground: "oklch(0.985 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.6 0.15 220)",
    chart1: "oklch(0.6 0.15 220)",
    chart2: "oklch(0.65 0.18 200)",
    chart3: "oklch(0.7 0.16 180)",
    chart4: "oklch(0.62 0.14 240)",
    chart5: "oklch(0.68 0.17 260)",
    sidebar: "oklch(0.985 0 0)",
    sidebarForeground: "oklch(0.145 0 0)",
    sidebarPrimary: "oklch(0.6 0.15 220)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    sidebarAccent: "oklch(0.97 0 0)",
    sidebarAccentForeground: "oklch(0.205 0 0)",
    sidebarBorder: "oklch(0.922 0 0)",
    sidebarRing: "oklch(0.6 0.15 220)",
  },
  dark: {
    background: "oklch(0.14 0.02 240)",
    foreground: "oklch(0.92 0.02 240)",
    card: "oklch(0.2 0.02 240)",
    cardForeground: "oklch(0.92 0.02 240)",
    popover: "oklch(0.26 0.02 240)",
    popoverForeground: "oklch(0.92 0.02 240)",
    primary: "oklch(0.7 0.15 220)",
    primaryForeground: "oklch(0.14 0.02 240)",
    secondary: "oklch(0.26 0.02 240)",
    secondaryForeground: "oklch(0.92 0.02 240)",
    muted: "oklch(0.26 0.02 240)",
    mutedForeground: "oklch(0.7 0.02 240)",
    accent: "oklch(0.75 0.18 200)",
    accentForeground: "oklch(0.14 0.02 240)",
    destructive: "oklch(0.704 0.191 22.216)",
    destructiveForeground: "oklch(0.92 0.02 240)",
    border: "oklch(0.26 0.02 240)",
    input: "oklch(0.26 0.02 240)",
    ring: "oklch(0.7 0.15 220)",
    chart1: "oklch(0.7 0.15 220)",
    chart2: "oklch(0.75 0.18 200)",
    chart3: "oklch(0.8 0.16 180)",
    chart4: "oklch(0.72 0.14 240)",
    chart5: "oklch(0.78 0.17 260)",
    sidebar: "oklch(0.2 0.02 240)",
    sidebarForeground: "oklch(0.7 0.02 240)",
    sidebarPrimary: "oklch(0.7 0.15 220)",
    sidebarPrimaryForeground: "oklch(0.92 0.02 240)",
    sidebarAccent: "oklch(0.26 0.02 240)",
    sidebarAccentForeground: "oklch(0.92 0.02 240)",
    sidebarBorder: "oklch(0.26 0.02 240)",
    sidebarRing: "oklch(0.7 0.15 220)",
  },
};

const monokaiOctagonPalette: ThemePalette = {
  name: "monokai-octagon",
  displayName: "Monokai Octagon",
  light: {
    background: "oklch(0.985 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    cardForeground: "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    popoverForeground: "oklch(0.145 0 0)",
    primary: "oklch(0.68 0.21 50)",
    primaryForeground: "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    secondaryForeground: "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    mutedForeground: "oklch(0.556 0 0)",
    accent: "oklch(0.72 0.19 40)",
    accentForeground: "oklch(0.145 0 0)",
    destructive: "oklch(0.62 0.26 25)",
    destructiveForeground: "oklch(0.985 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.68 0.21 50)",
    chart1: "oklch(0.68 0.21 50)",
    chart2: "oklch(0.72 0.19 40)",
    chart3: "oklch(0.65 0.22 30)",
    chart4: "oklch(0.7 0.18 60)",
    chart5: "oklch(0.66 0.2 70)",
    sidebar: "oklch(0.985 0 0)",
    sidebarForeground: "oklch(0.145 0 0)",
    sidebarPrimary: "oklch(0.68 0.21 50)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    sidebarAccent: "oklch(0.97 0 0)",
    sidebarAccentForeground: "oklch(0.205 0 0)",
    sidebarBorder: "oklch(0.922 0 0)",
    sidebarRing: "oklch(0.68 0.21 50)",
  },
  dark: {
    background: "oklch(0.145 0.01 40)",
    foreground: "oklch(0.95 0.01 40)",
    card: "oklch(0.205 0.01 40)",
    cardForeground: "oklch(0.95 0.01 40)",
    popover: "oklch(0.269 0.01 40)",
    popoverForeground: "oklch(0.95 0.01 40)",
    primary: "oklch(0.78 0.21 50)",
    primaryForeground: "oklch(0.145 0.01 40)",
    secondary: "oklch(0.269 0.01 40)",
    secondaryForeground: "oklch(0.95 0.01 40)",
    muted: "oklch(0.269 0.01 40)",
    mutedForeground: "oklch(0.708 0.01 40)",
    accent: "oklch(0.82 0.19 40)",
    accentForeground: "oklch(0.145 0.01 40)",
    destructive: "oklch(0.72 0.26 25)",
    destructiveForeground: "oklch(0.95 0.01 40)",
    border: "oklch(0.269 0.01 40)",
    input: "oklch(0.269 0.01 40)",
    ring: "oklch(0.78 0.21 50)",
    chart1: "oklch(0.78 0.21 50)",
    chart2: "oklch(0.82 0.19 40)",
    chart3: "oklch(0.75 0.22 30)",
    chart4: "oklch(0.8 0.18 60)",
    chart5: "oklch(0.76 0.2 70)",
    sidebar: "oklch(0.205 0.01 40)",
    sidebarForeground: "oklch(0.708 0.01 40)",
    sidebarPrimary: "oklch(0.78 0.21 50)",
    sidebarPrimaryForeground: "oklch(0.95 0.01 40)",
    sidebarAccent: "oklch(0.269 0.01 40)",
    sidebarAccentForeground: "oklch(0.95 0.01 40)",
    sidebarBorder: "oklch(0.269 0.01 40)",
    sidebarRing: "oklch(0.78 0.21 50)",
  },
};

const monokaiRistrettoPalette: ThemePalette = {
  name: "monokai-ristretto",
  displayName: "Monokai Ristretto",
  light: {
    background: "oklch(0.96 0.01 50)",
    foreground: "oklch(0.25 0.02 40)",
    card: "oklch(0.98 0.005 50)",
    cardForeground: "oklch(0.25 0.02 40)",
    popover: "oklch(0.98 0.005 50)",
    popoverForeground: "oklch(0.25 0.02 40)",
    primary: "oklch(0.55 0.12 40)",
    primaryForeground: "oklch(0.98 0.005 50)",
    secondary: "oklch(0.94 0.01 50)",
    secondaryForeground: "oklch(0.25 0.02 40)",
    muted: "oklch(0.94 0.01 50)",
    mutedForeground: "oklch(0.5 0.02 40)",
    accent: "oklch(0.6 0.14 35)",
    accentForeground: "oklch(0.98 0.005 50)",
    destructive: "oklch(0.52 0.18 25)",
    destructiveForeground: "oklch(0.98 0.005 50)",
    border: "oklch(0.88 0.01 50)",
    input: "oklch(0.88 0.01 50)",
    ring: "oklch(0.55 0.12 40)",
    chart1: "oklch(0.55 0.12 40)",
    chart2: "oklch(0.6 0.14 35)",
    chart3: "oklch(0.58 0.13 45)",
    chart4: "oklch(0.53 0.11 30)",
    chart5: "oklch(0.62 0.15 50)",
    sidebar: "oklch(0.96 0.01 50)",
    sidebarForeground: "oklch(0.25 0.02 40)",
    sidebarPrimary: "oklch(0.55 0.12 40)",
    sidebarPrimaryForeground: "oklch(0.98 0.005 50)",
    sidebarAccent: "oklch(0.94 0.01 50)",
    sidebarAccentForeground: "oklch(0.25 0.02 40)",
    sidebarBorder: "oklch(0.88 0.01 50)",
    sidebarRing: "oklch(0.55 0.12 40)",
  },
  dark: {
    background: "oklch(0.18 0.02 40)",
    foreground: "oklch(0.88 0.01 50)",
    card: "oklch(0.24 0.02 40)",
    cardForeground: "oklch(0.88 0.01 50)",
    popover: "oklch(0.3 0.02 40)",
    popoverForeground: "oklch(0.88 0.01 50)",
    primary: "oklch(0.65 0.12 40)",
    primaryForeground: "oklch(0.18 0.02 40)",
    secondary: "oklch(0.3 0.02 40)",
    secondaryForeground: "oklch(0.88 0.01 50)",
    muted: "oklch(0.3 0.02 40)",
    mutedForeground: "oklch(0.68 0.01 50)",
    accent: "oklch(0.7 0.14 35)",
    accentForeground: "oklch(0.18 0.02 40)",
    destructive: "oklch(0.62 0.18 25)",
    destructiveForeground: "oklch(0.88 0.01 50)",
    border: "oklch(0.3 0.02 40)",
    input: "oklch(0.3 0.02 40)",
    ring: "oklch(0.65 0.12 40)",
    chart1: "oklch(0.65 0.12 40)",
    chart2: "oklch(0.7 0.14 35)",
    chart3: "oklch(0.68 0.13 45)",
    chart4: "oklch(0.63 0.11 30)",
    chart5: "oklch(0.72 0.15 50)",
    sidebar: "oklch(0.24 0.02 40)",
    sidebarForeground: "oklch(0.68 0.01 50)",
    sidebarPrimary: "oklch(0.65 0.12 40)",
    sidebarPrimaryForeground: "oklch(0.88 0.01 50)",
    sidebarAccent: "oklch(0.3 0.02 40)",
    sidebarAccentForeground: "oklch(0.88 0.01 50)",
    sidebarBorder: "oklch(0.3 0.02 40)",
    sidebarRing: "oklch(0.65 0.12 40)",
  },
};

const monokaiSpectrumPalette: ThemePalette = {
  name: "monokai-spectrum",
  displayName: "Monokai Spectrum",
  light: {
    background: "oklch(0.985 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    cardForeground: "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    popoverForeground: "oklch(0.145 0 0)",
    primary: "oklch(0.6 0.24 290)",
    primaryForeground: "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    secondaryForeground: "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    mutedForeground: "oklch(0.556 0 0)",
    accent: "oklch(0.65 0.26 320)",
    accentForeground: "oklch(0.985 0 0)",
    destructive: "oklch(0.62 0.28 15)",
    destructiveForeground: "oklch(0.985 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.6 0.24 290)",
    chart1: "oklch(0.6 0.24 290)",
    chart2: "oklch(0.65 0.26 320)",
    chart3: "oklch(0.7 0.22 180)",
    chart4: "oklch(0.68 0.25 120)",
    chart5: "oklch(0.72 0.27 60)",
    sidebar: "oklch(0.985 0 0)",
    sidebarForeground: "oklch(0.145 0 0)",
    sidebarPrimary: "oklch(0.6 0.24 290)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    sidebarAccent: "oklch(0.97 0 0)",
    sidebarAccentForeground: "oklch(0.205 0 0)",
    sidebarBorder: "oklch(0.922 0 0)",
    sidebarRing: "oklch(0.6 0.24 290)",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    cardForeground: "oklch(0.985 0 0)",
    popover: "oklch(0.269 0 0)",
    popoverForeground: "oklch(0.985 0 0)",
    primary: "oklch(0.7 0.24 290)",
    primaryForeground: "oklch(0.145 0 0)",
    secondary: "oklch(0.269 0 0)",
    secondaryForeground: "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    mutedForeground: "oklch(0.708 0 0)",
    accent: "oklch(0.75 0.26 320)",
    accentForeground: "oklch(0.145 0 0)",
    destructive: "oklch(0.72 0.28 15)",
    destructiveForeground: "oklch(0.985 0 0)",
    border: "oklch(0.269 0 0)",
    input: "oklch(0.269 0 0)",
    ring: "oklch(0.7 0.24 290)",
    chart1: "oklch(0.7 0.24 290)",
    chart2: "oklch(0.75 0.26 320)",
    chart3: "oklch(0.8 0.22 180)",
    chart4: "oklch(0.78 0.25 120)",
    chart5: "oklch(0.82 0.27 60)",
    sidebar: "oklch(0.205 0 0)",
    sidebarForeground: "oklch(0.708 0 0)",
    sidebarPrimary: "oklch(0.7 0.24 290)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    sidebarAccent: "oklch(0.269 0 0)",
    sidebarAccentForeground: "oklch(0.985 0 0)",
    sidebarBorder: "oklch(0.269 0 0)",
    sidebarRing: "oklch(0.7 0.24 290)",
  },
};

const oneDarkProPalette: ThemePalette = {
  name: "onedark-pro",
  displayName: "OneDark Pro",
  light: {
    background: "oklch(0.98 0.005 250)",
    foreground: "oklch(0.25 0.02 250)",
    card: "oklch(0.99 0.003 250)",
    cardForeground: "oklch(0.25 0.02 250)",
    popover: "oklch(0.99 0.003 250)",
    popoverForeground: "oklch(0.25 0.02 250)",
    primary: "oklch(0.55 0.15 250)",
    primaryForeground: "oklch(0.99 0.003 250)",
    secondary: "oklch(0.95 0.005 250)",
    secondaryForeground: "oklch(0.25 0.02 250)",
    muted: "oklch(0.95 0.005 250)",
    mutedForeground: "oklch(0.5 0.02 250)",
    accent: "oklch(0.6 0.17 270)",
    accentForeground: "oklch(0.99 0.003 250)",
    destructive: "oklch(0.55 0.22 25)",
    destructiveForeground: "oklch(0.99 0.003 250)",
    border: "oklch(0.9 0.005 250)",
    input: "oklch(0.9 0.005 250)",
    ring: "oklch(0.55 0.15 250)",
    chart1: "oklch(0.55 0.15 250)",
    chart2: "oklch(0.6 0.17 270)",
    chart3: "oklch(0.65 0.2 190)",
    chart4: "oklch(0.62 0.18 140)",
    chart5: "oklch(0.58 0.16 320)",
    sidebar: "oklch(0.98 0.005 250)",
    sidebarForeground: "oklch(0.25 0.02 250)",
    sidebarPrimary: "oklch(0.55 0.15 250)",
    sidebarPrimaryForeground: "oklch(0.99 0.003 250)",
    sidebarAccent: "oklch(0.95 0.005 250)",
    sidebarAccentForeground: "oklch(0.25 0.02 250)",
    sidebarBorder: "oklch(0.9 0.005 250)",
    sidebarRing: "oklch(0.55 0.15 250)",
  },
  dark: {
    background: "oklch(0.18 0.02 250)",
    foreground: "oklch(0.88 0.01 250)",
    card: "oklch(0.22 0.02 250)",
    cardForeground: "oklch(0.88 0.01 250)",
    popover: "oklch(0.26 0.02 250)",
    popoverForeground: "oklch(0.88 0.01 250)",
    primary: "oklch(0.65 0.15 250)",
    primaryForeground: "oklch(0.18 0.02 250)",
    secondary: "oklch(0.26 0.02 250)",
    secondaryForeground: "oklch(0.88 0.01 250)",
    muted: "oklch(0.26 0.02 250)",
    mutedForeground: "oklch(0.68 0.01 250)",
    accent: "oklch(0.7 0.17 270)",
    accentForeground: "oklch(0.18 0.02 250)",
    destructive: "oklch(0.65 0.22 25)",
    destructiveForeground: "oklch(0.88 0.01 250)",
    border: "oklch(0.26 0.02 250)",
    input: "oklch(0.26 0.02 250)",
    ring: "oklch(0.65 0.15 250)",
    chart1: "oklch(0.65 0.15 250)",
    chart2: "oklch(0.7 0.17 270)",
    chart3: "oklch(0.75 0.2 190)",
    chart4: "oklch(0.72 0.18 140)",
    chart5: "oklch(0.68 0.16 320)",
    sidebar: "oklch(0.22 0.02 250)",
    sidebarForeground: "oklch(0.68 0.01 250)",
    sidebarPrimary: "oklch(0.65 0.15 250)",
    sidebarPrimaryForeground: "oklch(0.88 0.01 250)",
    sidebarAccent: "oklch(0.26 0.02 250)",
    sidebarAccentForeground: "oklch(0.88 0.01 250)",
    sidebarBorder: "oklch(0.26 0.02 250)",
    sidebarRing: "oklch(0.65 0.15 250)",
  },
};

const draculaPalette: ThemePalette = {
  name: "dracula",
  displayName: "Dracula",
  light: {
    background: "oklch(0.97 0.01 290)",
    foreground: "oklch(0.25 0.02 290)",
    card: "oklch(0.99 0.005 290)",
    cardForeground: "oklch(0.25 0.02 290)",
    popover: "oklch(0.99 0.005 290)",
    popoverForeground: "oklch(0.25 0.02 290)",
    primary: "oklch(0.65 0.22 290)",
    primaryForeground: "oklch(0.99 0.005 290)",
    secondary: "oklch(0.94 0.01 290)",
    secondaryForeground: "oklch(0.25 0.02 290)",
    muted: "oklch(0.94 0.01 290)",
    mutedForeground: "oklch(0.5 0.02 290)",
    accent: "oklch(0.7 0.24 330)",
    accentForeground: "oklch(0.99 0.005 290)",
    destructive: "oklch(0.6 0.26 15)",
    destructiveForeground: "oklch(0.99 0.005 290)",
    border: "oklch(0.88 0.01 290)",
    input: "oklch(0.88 0.01 290)",
    ring: "oklch(0.65 0.22 290)",
    chart1: "oklch(0.65 0.22 290)",
    chart2: "oklch(0.7 0.24 330)",
    chart3: "oklch(0.72 0.26 190)",
    chart4: "oklch(0.68 0.23 120)",
    chart5: "oklch(0.75 0.25 60)",
    sidebar: "oklch(0.97 0.01 290)",
    sidebarForeground: "oklch(0.25 0.02 290)",
    sidebarPrimary: "oklch(0.65 0.22 290)",
    sidebarPrimaryForeground: "oklch(0.99 0.005 290)",
    sidebarAccent: "oklch(0.94 0.01 290)",
    sidebarAccentForeground: "oklch(0.25 0.02 290)",
    sidebarBorder: "oklch(0.88 0.01 290)",
    sidebarRing: "oklch(0.65 0.22 290)",
  },
  dark: {
    background: "oklch(0.19 0.03 290)",
    foreground: "oklch(0.92 0.01 290)",
    card: "oklch(0.24 0.03 290)",
    cardForeground: "oklch(0.92 0.01 290)",
    popover: "oklch(0.28 0.03 290)",
    popoverForeground: "oklch(0.92 0.01 290)",
    primary: "oklch(0.75 0.22 290)",
    primaryForeground: "oklch(0.19 0.03 290)",
    secondary: "oklch(0.28 0.03 290)",
    secondaryForeground: "oklch(0.92 0.01 290)",
    muted: "oklch(0.28 0.03 290)",
    mutedForeground: "oklch(0.72 0.01 290)",
    accent: "oklch(0.8 0.24 330)",
    accentForeground: "oklch(0.19 0.03 290)",
    destructive: "oklch(0.7 0.26 15)",
    destructiveForeground: "oklch(0.92 0.01 290)",
    border: "oklch(0.28 0.03 290)",
    input: "oklch(0.28 0.03 290)",
    ring: "oklch(0.75 0.22 290)",
    chart1: "oklch(0.75 0.22 290)",
    chart2: "oklch(0.8 0.24 330)",
    chart3: "oklch(0.82 0.26 190)",
    chart4: "oklch(0.78 0.23 120)",
    chart5: "oklch(0.85 0.25 60)",
    sidebar: "oklch(0.24 0.03 290)",
    sidebarForeground: "oklch(0.72 0.01 290)",
    sidebarPrimary: "oklch(0.75 0.22 290)",
    sidebarPrimaryForeground: "oklch(0.92 0.01 290)",
    sidebarAccent: "oklch(0.28 0.03 290)",
    sidebarAccentForeground: "oklch(0.92 0.01 290)",
    sidebarBorder: "oklch(0.28 0.03 290)",
    sidebarRing: "oklch(0.75 0.22 290)",
  },
};

export const themePalettes: Record<string, ThemePalette> = {
  "monokai-pro": monokaiProPalette,
  "monokai-classic": monokaiClassicPalette,
  "monokai-machine": monokaiMachinePalette,
  "monokai-octagon": monokaiOctagonPalette,
  "monokai-ristretto": monokaiRistrettoPalette,
  "monokai-spectrum": monokaiSpectrumPalette,
  "onedark-pro": oneDarkProPalette,
  dracula: draculaPalette,
};

export const themeGroups = [
  {
    label: "Monokai",
    themes: [
      "monokai-pro",
      "monokai-classic",
      "monokai-machine",
      "monokai-octagon",
      "monokai-ristretto",
      "monokai-spectrum",
    ],
  },
  {
    label: "Others",
    themes: ["onedark-pro", "dracula"],
  },
];

export function getThemePalette(themeName: string): ThemePalette | null {
  return themePalettes[themeName] || null;
}

export function getThemeColors(
  themeName: string,
  mode: "light" | "dark"
): ThemeColors | null {
  const palette = getThemePalette(themeName);
  if (!palette) return null;
  return palette[mode];
}

export type ThemeVariant = {
  themeName: string;
  mode: "light" | "dark" | "system";
  displayName: string;
};

export function parseThemeVariant(variant: string): ThemeVariant {
  const parts = variant.split("-");
  const mode = parts[parts.length - 1] as "light" | "dark" | "system";
  const themeName = parts.slice(0, -1).join("-");

  const palette = getThemePalette(themeName);
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  const displayName = palette
    ? `${palette.displayName} ${modeLabel}`
    : `${themeName} ${modeLabel}`;

  return { themeName, mode, displayName };
}

export function createThemeVariant(themeName: string, mode: string): string {
  return `${themeName}-${mode}`;
}

export function getAllThemeVariants(): ThemeVariant[] {
  const variants: ThemeVariant[] = [];
  const modes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

  Object.keys(themePalettes).forEach((themeName) => {
    modes.forEach((mode) => {
      const variant = createThemeVariant(themeName, mode);
      variants.push(parseThemeVariant(variant));
    });
  });

  return variants;
}

export function getThemeVariantsByGroup(): Array<{
  label: string;
  variants: ThemeVariant[];
}> {
  const modes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

  return themeGroups.map((group) => ({
    label: group.label,
    variants: group.themes.flatMap((themeName) =>
      modes.map((mode) => {
        const variant = createThemeVariant(themeName, mode);
        return parseThemeVariant(variant);
      })
    ),
  }));
}
