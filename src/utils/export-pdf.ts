import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { formatNumber } from "@/lib/locale-utils";
import { format } from "date-fns";

export interface PDFExportOptions {
  title: string;
  dateRange: { start: Date; end: Date };
  chartElements?: HTMLElement[];
  tables?: {
    title: string;
    headers: string[];
    rows: string[][];
  }[];
  summary?: {
    label: string;
    value: string;
  }[];
}

export async function exportToPDF(options: PDFExportOptions): Promise<void> {
  const { title, dateRange, chartElements = [], tables = [], summary = [] } = options;

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  pdf.setFontSize(20);
  pdf.text(title, margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(
    `Period: ${format(dateRange.start, "MMM d, yyyy")} - ${format(dateRange.end, "MMM d, yyyy")}`,
    margin,
    yPosition
  );
  yPosition += 10;

  pdf.setTextColor(0);

  if (summary.length > 0) {
    pdf.setFontSize(14);
    pdf.text("Summary", margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    summary.forEach((item) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(`${item.label}:`, margin, yPosition);
      pdf.text(item.value, pageWidth - margin - 50, yPosition);
      yPosition += 6;
    });

    yPosition += 5;
  }

  for (const chartElement of chartElements) {
    if (yPosition > pageHeight - 100) {
      pdf.addPage();
      yPosition = margin;
    }

    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (yPosition + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      console.error("Error converting chart to image:", error);
    }
  }

  tables.forEach((table) => {
    if (yPosition > pageHeight - 50) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(14);
    pdf.text(table.title, margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(9);
    const colWidth = (pageWidth - 2 * margin) / table.headers.length;

    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 7, "F");

    table.headers.forEach((header, index) => {
      pdf.text(header, margin + index * colWidth + 2, yPosition);
    });
    yPosition += 8;

    table.rows.forEach((row) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;

        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 7, "F");
        table.headers.forEach((header, index) => {
          pdf.text(header, margin + index * colWidth + 2, yPosition);
        });
        yPosition += 8;
      }

      row.forEach((cell, index) => {
        pdf.text(cell, margin + index * colWidth + 2, yPosition);
      });
      yPosition += 6;
    });

    yPosition += 10;
  });

  pdf.setFontSize(8);
  pdf.setTextColor(150);
  const footerText = `Generated on ${format(new Date(), "MMM d, yyyy HH:mm")}`;
  pdf.text(footerText, margin, pageHeight - 10);

  const fileName = `${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  pdf.save(fileName);
}

