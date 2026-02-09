import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Polyhouse } from '@shared/types';

export interface ExportData {
  projectName: string;
  locationName: string;
  customerName?: string;
  customerEmail?: string;
  landAreaSqm: number;
  polyhouseCount: number;
  totalCoverageSqm: number;
  utilizationPercentage: number;
  estimatedCost: number;
  polyhouses: Polyhouse[];
  quotation: any;
  landBoundary?: any;
  createdAt: string;
}

/**
 * Generate PDF with project details, map screenshot, and quotation
 */
export async function generateProjectPDF(data: ExportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // HEADER
  pdf.setFillColor(76, 175, 80); // SiteSense green
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SITESENSE', margin, 20);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Polyhouse Planning Report', margin, 30);

  yPosition = 50;

  // PROJECT INFORMATION
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Project Information', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Project Name: ${data.projectName}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Location: ${data.locationName || 'Not specified'}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Date: ${new Date(data.createdAt).toLocaleDateString('en-IN')}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Total Land Area: ${data.landAreaSqm.toFixed(0)} sqm (${(data.landAreaSqm * 0.000247105).toFixed(2)} acres)`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Number of Polyhouses: ${data.polyhouseCount}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Total Coverage: ${data.totalCoverageSqm.toFixed(0)} sqm (${data.utilizationPercentage.toFixed(1)}% utilization)`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Estimated Cost: ₹${data.estimatedCost.toLocaleString('en-IN')}`, margin, yPosition);
  yPosition += 12;

  // POLYHOUSE DETAILS
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Polyhouse Details', margin, yPosition);
  yPosition += 10;

  // Table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Label', margin + 3, yPosition);
  pdf.text('Blocks', margin + 25, yPosition);
  pdf.text('Area (sqm)', margin + 50, yPosition);
  pdf.text('Length × Width', margin + 85, yPosition);
  pdf.text('Coverage %', margin + 130, yPosition);
  yPosition += 8;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  data.polyhouses.forEach((ph, index) => {
    // Add color indicator
    if (ph.color) {
      const rgb = hexToRgb(ph.color);
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.circle(margin + 1, yPosition - 2, 1.5, 'F');
    }

    const coverage = ((ph.area / data.landAreaSqm) * 100).toFixed(1);
    const gableLength = ph.gableLength || ph.dimensions?.length || 0;
    const gutterWidth = ph.gutterWidth || ph.dimensions?.width || 0;
    const dimensions = `${gableLength.toFixed(1)}m × ${gutterWidth.toFixed(1)}m`;

    // Calculate number of blocks (8m x 4m)
    const numBlocks = Math.floor(gableLength / 8) * Math.floor(gutterWidth / 4);

    pdf.setTextColor(0, 0, 0);
    pdf.text(ph.label || `P${index + 1}`, margin + 6, yPosition);
    pdf.text(numBlocks.toString(), margin + 28, yPosition);
    pdf.text(ph.area.toFixed(0), margin + 52, yPosition);
    pdf.text(dimensions, margin + 85, yPosition);
    pdf.text(`${coverage}%`, margin + 132, yPosition);

    yPosition += 7;

    // Check if we need a new page
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = margin;
    }
  });

  yPosition += 8;

  // MAP SCREENSHOT
  try {
    const mapElement = document.getElementById('project-map-container');
    if (mapElement) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Layout Map', margin, yPosition);
      yPosition += 10;

      const canvas = await html2canvas(mapElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if image fits on current page
      if (yPosition + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Layout Map', margin, yPosition);
        yPosition += 10;
      }

      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    }
  } catch (error) {
    console.error('Error capturing map screenshot:', error);
  }

  // QUOTATION - Professional Format
  if (data.quotation && Object.keys(data.quotation).length > 0) {
    // Add new page for quotation
    pdf.addPage();
    yPosition = margin;

    // Quotation Header with border
    pdf.setFillColor(76, 175, 80);
    pdf.rect(0, 0, pageWidth, 35, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('QUOTATION', pageWidth / 2, 15, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Quote Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, 25, { align: 'center' });

    yPosition = 45;

    // Company and Customer Information Side by Side
    pdf.setTextColor(0, 0, 0);

    // Company Info (Left)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FROM:', margin, yPosition);
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text('SiteSense', margin, yPosition);
    yPosition += 5;
    pdf.text('Polyhouse Planning Solutions', margin, yPosition);
    yPosition += 5;
    pdf.text('Email: info@sitesense.com', margin, yPosition);
    yPosition += 5;
    pdf.text('Phone: +91 XXX XXX XXXX', margin, yPosition);

    // Customer Info (Right)
    const customerStartY = 50;
    let customerY = customerStartY;
    pdf.setFont('helvetica', 'bold');
    pdf.text('TO:', pageWidth - margin - 60, customerY);
    customerY += 5;
    pdf.setFont('helvetica', 'normal');
    if (data.customerName) {
      pdf.text(data.customerName, pageWidth - margin - 60, customerY);
      customerY += 5;
    }
    if (data.customerEmail) {
      pdf.text(data.customerEmail, pageWidth - margin - 60, customerY);
      customerY += 5;
    }
    pdf.text(`Project: ${data.projectName}`, pageWidth - margin - 60, customerY);
    customerY += 5;
    pdf.text(`Location: ${data.locationName || 'Not specified'}`, pageWidth - margin - 60, customerY);

    yPosition = Math.max(yPosition, customerY) + 10;

    // Project Summary Box
    pdf.setDrawColor(76, 175, 80);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 25);

    yPosition += 7;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Land Area: ${data.landAreaSqm.toFixed(0)} sqm`, margin + 3, yPosition);
    pdf.text(`Polyhouses: ${data.polyhouseCount}`, margin + 60, yPosition);
    pdf.text(`Coverage: ${data.totalCoverageSqm.toFixed(0)} sqm (${data.utilizationPercentage.toFixed(1)}%)`, margin + 100, yPosition);

    yPosition += 12;

    // Cost Breakdown Section
    yPosition += 8;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('COST BREAKDOWN', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    if (data.quotation.items && Array.isArray(data.quotation.items) && data.quotation.items.length > 0) {
      // Process quotation items
      const flattenedItems: any[] = [];

      data.quotation.items.forEach((item: any) => {
        if (item.materialSelections && Array.isArray(item.materialSelections)) {
          item.materialSelections.forEach((material: any) => {
            flattenedItems.push({
              description: item.description || item.category,
              quantity: material.quantity,
              unit: material.unit || 'unit',
              rate: material.unitPrice,
              amount: material.totalPrice
            });
          });
        } else {
          flattenedItems.push({
            description: item.description || item.category || 'Item',
            quantity: item.quantity || '-',
            unit: item.unit || 'unit',
            rate: item.rate || item.unitPrice || 0,
            amount: item.amount || item.totalPrice || 0
          });
        }
      });

      if (flattenedItems.length > 0) {
        // Table with proper borders
        const tableStartY = yPosition;
        const rowHeight = 7;
        const colWidths = [8, 75, 25, 35, 35]; // S.No, Description, Qty, Rate, Amount
        const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);

        // Draw table border
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);

        // Header row with background
        pdf.setFillColor(76, 175, 80);
        pdf.rect(margin, yPosition - 5, tableWidth, 8, 'F');

        // Header borders
        pdf.setDrawColor(255, 255, 255);
        let xPos = margin;
        colWidths.forEach((width, i) => {
          if (i > 0) {
            pdf.line(xPos, yPosition - 5, xPos, yPosition + 3);
          }
          xPos += width;
        });

        // Header text
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        xPos = margin;
        pdf.text('S.No', xPos + 2, yPosition, { align: 'left' });
        xPos += colWidths[0];
        pdf.text('Description', xPos + 2, yPosition, { align: 'left' });
        xPos += colWidths[1];
        pdf.text('Quantity', xPos + 2, yPosition, { align: 'left' });
        xPos += colWidths[2];
        pdf.text('Rate (₹)', xPos + 2, yPosition, { align: 'left' });
        xPos += colWidths[3];
        pdf.text('Amount (₹)', xPos + 2, yPosition, { align: 'left' });

        yPosition += 8;

        // Data rows
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setDrawColor(200, 200, 200);

        flattenedItems.forEach((item: any, index: number) => {
          // Row background (alternate)
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(margin, yPosition - 5, tableWidth, rowHeight, 'F');
          }

          // Cell borders
          xPos = margin;
          colWidths.forEach((width, i) => {
            if (i > 0) {
              pdf.line(xPos, yPosition - 5, xPos, yPosition + 2);
            }
            xPos += width;
          });

          // Horizontal line
          pdf.line(margin, yPosition + 2, margin + tableWidth, yPosition + 2);

          // Cell data
          xPos = margin;
          pdf.text((index + 1).toString(), xPos + 2, yPosition);
          xPos += colWidths[0];

          const desc = item.description.length > 45 ? item.description.substring(0, 42) + '...' : item.description;
          pdf.text(desc, xPos + 2, yPosition);
          xPos += colWidths[1];

          const qtyText = typeof item.quantity === 'number' ? item.quantity.toFixed(2) : item.quantity.toString();
          pdf.text(`${qtyText} ${item.unit}`, xPos + 2, yPosition);
          xPos += colWidths[2];

          pdf.text(item.rate.toLocaleString('en-IN'), xPos + 2, yPosition);
          xPos += colWidths[3];

          pdf.text(item.amount.toLocaleString('en-IN'), xPos + 2, yPosition);

          yPosition += rowHeight;

          if (yPosition > pageHeight - 60) {
            pdf.addPage();
            yPosition = margin + 20;
          }
        });

        // Close table border
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, tableStartY - 5, tableWidth, yPosition - tableStartY + 5);

        yPosition += 10;

        // Financial Summary Box
        const summaryBoxX = pageWidth - margin - 75;
        const summaryBoxY = yPosition;
        const summaryBoxWidth = 75;

        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, 30);

        yPosition = summaryBoxY + 7;
        pdf.setFontSize(9);

        // Calculate costs
        const totalCost = data.quotation.totalCost || data.estimatedCost || 0;
        const subtotal = totalCost / 1.18;
        const gst = totalCost - subtotal;

        // Subtotal
        pdf.setFont('helvetica', 'normal');
        pdf.text('Subtotal:', summaryBoxX + 3, yPosition);
        pdf.text(`₹${Math.round(subtotal).toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 3, yPosition, { align: 'right' });
        yPosition += 6;

        // GST
        pdf.text('GST (18%):', summaryBoxX + 3, yPosition);
        pdf.text(`₹${Math.round(gst).toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 3, yPosition, { align: 'right' });
        yPosition += 6;

        // Divider
        pdf.setDrawColor(0, 0, 0);
        pdf.line(summaryBoxX + 3, yPosition - 2, summaryBoxX + summaryBoxWidth - 3, yPosition - 2);
        yPosition += 1;

        // Total
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('Grand Total:', summaryBoxX + 3, yPosition);
        pdf.text(`₹${totalCost.toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 3, yPosition, { align: 'right' });

        yPosition += 20;

        // Terms and Conditions
        if (yPosition > pageHeight - 70) {
          pdf.addPage();
          yPosition = margin + 20;
        }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TERMS & CONDITIONS', margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const terms = [
          '• This quotation is valid for 30 days from the date of issue.',
          '• 50% advance payment required to commence work.',
          '• Balance payment due upon project completion.',
          '• Prices include materials, installation, and basic warranty.',
          '• Site preparation and leveling costs are additional if required.',
          '• Delivery timeline: 4-6 weeks from order confirmation.'
        ];

        terms.forEach(term => {
          pdf.text(term, margin, yPosition);
          yPosition += 5;
        });

        yPosition += 10;

        // Signature section
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin + 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text('Authorized Signature', margin, yPosition);
        pdf.text('Customer Signature', pageWidth - margin - 60, yPosition);

        yPosition += 15;
        pdf.setDrawColor(0, 0, 0);
        pdf.line(margin, yPosition, margin + 60, yPosition);
        pdf.line(pageWidth - margin - 60, yPosition, pageWidth - margin, yPosition);
      }
    } else {
      // Simplified quotation if no detailed items
      pdf.setFont('helvetica', 'normal');
      pdf.text('Total Estimated Cost:', margin, yPosition);
      yPosition += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      const totalCost = data.quotation.totalCost || data.estimatedCost || 0;
      pdf.text(`₹${totalCost.toLocaleString('en-IN')}`, margin, yPosition);
    }
  }

  // FOOTER
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages} | Generated by SiteSense System | ${new Date().toLocaleDateString('en-IN')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = `${data.projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}.pdf`;
  pdf.save(fileName);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
