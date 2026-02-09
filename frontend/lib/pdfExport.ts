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
  pdf.setFillColor(76, 175, 80); // Agriplast green
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('AGRIPLAST', margin, 20);

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

  // QUOTATION
  if (data.quotation && Object.keys(data.quotation).length > 0) {
    // Add new page for quotation
    pdf.addPage();
    yPosition = margin;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Cost Quotation', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    if (data.quotation.items && Array.isArray(data.quotation.items) && data.quotation.items.length > 0) {
      // Process quotation items - handle both QuotationItem and material selections
      const flattenedItems: any[] = [];

      data.quotation.items.forEach((item: any) => {
        if (item.materialSelections && Array.isArray(item.materialSelections)) {
          // This is a QuotationItem with material selections
          item.materialSelections.forEach((material: any) => {
            flattenedItems.push({
              description: item.description || item.category,
              quantity: material.quantity,
              rate: material.unitPrice,
              amount: material.totalPrice
            });
          });
        } else {
          // This is a direct item
          flattenedItems.push(item);
        }
      });

      if (flattenedItems.length > 0) {
        // Table header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.text('Item', margin + 3, yPosition);
        pdf.text('Quantity', margin + 100, yPosition);
        pdf.text('Rate', margin + 130, yPosition);
        pdf.text('Amount', margin + 160, yPosition);
        yPosition += 8;

        pdf.setFont('helvetica', 'normal');
        flattenedItems.forEach((item: any) => {
          const desc = item.description || item.category || 'Item';
          pdf.text(desc.length > 40 ? desc.substring(0, 37) + '...' : desc, margin + 3, yPosition);
          pdf.text(item.quantity?.toString() || '-', margin + 100, yPosition);
          pdf.text(`₹${item.rate?.toLocaleString('en-IN') || '0'}`, margin + 130, yPosition);
          pdf.text(`₹${item.amount?.toLocaleString('en-IN') || '0'}`, margin + 160, yPosition);
          yPosition += 7;

          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = margin;
          }
        });

        yPosition += 5;

        // Totals
        pdf.setFont('helvetica', 'bold');
        const totalCost = data.quotation.totalCost || data.estimatedCost || 0;
        const subtotal = totalCost / 1.18; // Assuming 18% GST
        const tax = totalCost - subtotal;

        if (subtotal > 0) {
          pdf.text('Subtotal:', margin + 130, yPosition);
          pdf.text(`₹${Math.round(subtotal).toLocaleString('en-IN')}`, margin + 160, yPosition);
          yPosition += 7;
        }
        if (tax > 0) {
          pdf.text('GST (18%):', margin + 130, yPosition);
          pdf.text(`₹${Math.round(tax).toLocaleString('en-IN')}`, margin + 160, yPosition);
          yPosition += 7;
        }
        if (totalCost > 0) {
          pdf.setDrawColor(0, 0, 0);
          pdf.line(margin + 125, yPosition - 2, pageWidth - margin, yPosition - 2);
          pdf.text('Total:', margin + 130, yPosition + 3);
          pdf.text(`₹${totalCost.toLocaleString('en-IN')}`, margin + 160, yPosition + 3);
        }
      }
    } else {
      // Show simple total if no itemized data
      pdf.setFont('helvetica', 'normal');
      pdf.text('Total Estimated Cost:', margin + 3, yPosition);
      yPosition += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      const totalCost = data.quotation.totalCost || data.estimatedCost || 0;
      pdf.text(`₹${totalCost.toLocaleString('en-IN')}`, margin + 3, yPosition);
    }
  }

  // FOOTER
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages} | Generated by Agriplast System | ${new Date().toLocaleDateString('en-IN')}`,
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
