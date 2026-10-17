import { shellLayoutTranslations } from "./shell";
import { peopleLayoutTranslations } from "./people";
import { transactionsLayoutTranslations } from "./transactions";
import { devtoolLayoutTranslations } from "./devtool";
import { devtoolToolsLayoutTranslations } from "./devtool-tools";
import { insightsLayoutTranslations } from "./insights";

/** Mounted under `admin.layout.*`; each area owns its own file. */
export const adminLayoutTranslations = {
  en: {
    shell: shellLayoutTranslations.en,
    people: peopleLayoutTranslations.en,
    transactions: transactionsLayoutTranslations.en,
    devtool: devtoolLayoutTranslations.en,
    devtoolTools: devtoolToolsLayoutTranslations.en,
    insights: insightsLayoutTranslations.en,
  },
  vi: {
    shell: shellLayoutTranslations.vi,
    people: peopleLayoutTranslations.vi,
    transactions: transactionsLayoutTranslations.vi,
    devtool: devtoolLayoutTranslations.vi,
    devtoolTools: devtoolToolsLayoutTranslations.vi,
    insights: insightsLayoutTranslations.vi,
  },
} as const;
