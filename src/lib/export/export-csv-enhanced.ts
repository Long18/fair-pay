import { format } from "date-fns";

export interface CSVExportOptions {
  filename: string;
  data: {
    sheetName: string;
    headers: string[];
    rows: (string | number)[][];
  }[];
}

export function exportToCSV(options: CSVExportOptions): void {
  const { filename, data } = options;

  let csvContent = "";

  data.forEach((sheet, sheetIndex) => {
    if (sheetIndex > 0) {
      csvContent += "\n\n";
    }

    csvContent += `${sheet.sheetName}\n`;

    const headerRow = sheet.headers.map(escapeCSVField).join(",");
    csvContent += headerRow + "\n";

    sheet.rows.forEach((row) => {
      const rowContent = row.map((cell) => escapeCSVField(String(cell))).join(",");
      csvContent += rowContent + "\n";
    });
  });

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export interface EnhancedCSVExportData {
  summary: {
    label: string;
    value: string;
  }[];
  categoryBreakdown: {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  trendData: {
    period: string;
    amount: number;
    count: number;
  }[];
  topSpenders?: {
    name: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
}

export function exportEnhancedReportToCSV(
  data: EnhancedCSVExportData,
  filename: string
): void {
  const sheets = [
    {
      sheetName: "Summary",
      headers: ["Metric", "Value"],
      rows: data.summary.map((item) => [item.label, item.value]),
    },
    {
      sheetName: "Category Breakdown",
      headers: ["Category", "Amount", "Count", "Percentage"],
      rows: data.categoryBreakdown.map((item) => [
        item.category,
        item.amount,
        item.count,
        `${item.percentage.toFixed(2)}%`,
      ]),
    },
    {
      sheetName: "Trend Data",
      headers: ["Period", "Amount", "Count"],
      rows: data.trendData.map((item) => [item.period, item.amount, item.count]),
    },
  ];

  if (data.topSpenders && data.topSpenders.length > 0) {
    sheets.push({
      sheetName: "Top Spenders",
      headers: ["Name", "Amount", "Count", "Percentage"],
      rows: data.topSpenders.map((item) => [
        item.name,
        item.amount,
        item.count,
        `${item.percentage.toFixed(2)}%`,
      ]),
    });
  }

  exportToCSV({ filename, data: sheets });
}
