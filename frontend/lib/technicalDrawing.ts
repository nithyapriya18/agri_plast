import jsPDF from 'jspdf';
import { Polyhouse, Coordinate } from '@shared/types';

export interface TechnicalDrawingData {
  projectName: string;
  customerName: string;
  locationName: string;
  landBoundary: Coordinate[];
  landAreaSqm: number;
  polyhouses: Polyhouse[];
  polyhouseCount: number;
  totalCoverageSqm: number;
  utilizationPercentage: number;
  createdAt: string;
}

/**
 * Generate professional CAD-style technical drawing
 * Matches the exact format shown in customer examples
 */
export async function generateTechnicalDrawing(data: TechnicalDrawingData): Promise<Blob> {
  // Validate input data
  if (!data.landBoundary || data.landBoundary.length === 0) {
    throw new Error('Land boundary is required for technical drawing');
  }
  if (!data.polyhouses || data.polyhouses.length === 0) {
    throw new Error('At least one polyhouse is required for technical drawing');
  }

  // A4 landscape for better layout visibility
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Calculate drawing area (leave margins for legend and info)
  const drawingMargin = 15;
  const legendWidth = 70;
  const drawingWidth = pageWidth - legendWidth - (drawingMargin * 3);
  const drawingHeight = pageHeight - (drawingMargin * 2);
  const drawingStartX = drawingMargin;
  const drawingStartY = drawingMargin;

  // === MAIN DRAWING AREA ===
  drawMainLayout(pdf, data, drawingStartX, drawingStartY, drawingWidth, drawingHeight);

  // === COMPASS ROSE ===
  drawCompassRose(pdf, pageWidth - 35, 25);

  // === LEGEND AND INFO BOX (top right) ===
  drawLegendBox(pdf, pageWidth - legendWidth - drawingMargin, drawingMargin + 30, legendWidth, 70, data);

  // === TITLE BLOCK (bottom right) ===
  drawTitleBlock(pdf, pageWidth - legendWidth - drawingMargin, pageHeight - 55, legendWidth, 50, data);

  // === AGRIPLAST BRANDING (bottom right corner) ===
  drawBranding(pdf, pageWidth - legendWidth - drawingMargin, pageHeight - 3);

  return pdf.output('blob');
}

/**
 * Draw the main polyhouse layout with land boundary
 */
function drawMainLayout(
  pdf: jsPDF,
  data: TechnicalDrawingData,
  startX: number,
  startY: number,
  width: number,
  height: number
) {
  // Draw outer border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(startX, startY, width, height);

  // Calculate bounds of land boundary
  const lats = data.landBoundary.map(c => c.lat);
  const lngs = data.landBoundary.map(c => c.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  // Add padding (10% on each side)
  const padding = 0.1;
  const scale = Math.min(
    (width * (1 - 2 * padding)) / lngRange,
    (height * (1 - 2 * padding)) / latRange
  );

  // Center the drawing
  const centerOffsetX = (width - (lngRange * scale)) / 2;
  const centerOffsetY = (height - (latRange * scale)) / 2;

  // Function to convert lat/lng to PDF coordinates
  const toPdfCoords = (coord: Coordinate) => ({
    x: startX + centerOffsetX + ((coord.lng - minLng) * scale),
    y: startY + height - centerOffsetY - ((coord.lat - minLat) * scale), // Flip Y axis
  });

  // Draw land boundary (pink/magenta outline)
  pdf.setDrawColor(255, 0, 128);
  pdf.setLineWidth(0.8);
  const boundaryPoints = data.landBoundary.map(toPdfCoords);
  pdf.lines(
    boundaryPoints.slice(1).map((p, i) => [p.x - boundaryPoints[i].x, p.y - boundaryPoints[i].y]),
    boundaryPoints[0].x,
    boundaryPoints[0].y,
    [1, 1],
    'S',
    true
  );

  // Draw each polyhouse
  data.polyhouses.forEach((polyhouse, index) => {
    if (!polyhouse.bounds || polyhouse.bounds.length === 0) return;

    // Draw gutter outline (light green)
    pdf.setFillColor(200, 255, 200);
    pdf.setDrawColor(0, 128, 0);
    pdf.setLineWidth(0.3);

    const gutterPoints = polyhouse.bounds.map(p => toPdfCoords({ lat: p.y, lng: p.x }));
    pdf.lines(
      gutterPoints.slice(1).map((p, i) => [p.x - gutterPoints[i].x, p.y - gutterPoints[i].y]),
      gutterPoints[0].x,
      gutterPoints[0].y,
      [1, 1],
      'FD',
      true
    );

    // Draw blocks (grid pattern)
    if (polyhouse.blocks && polyhouse.blocks.length > 0) {
      polyhouse.blocks.forEach((block) => {
        if (!block.corners || block.corners.length === 0) return;

        // Draw block fill (brown/red grid pattern)
        pdf.setFillColor(160, 82, 45);
        pdf.setDrawColor(139, 69, 19);
        pdf.setLineWidth(0.1);

        const blockPoints = block.corners.map(c => toPdfCoords({ lat: c.y, lng: c.x }));
        pdf.lines(
          blockPoints.slice(1).map((p, i) => [p.x - blockPoints[i].x, p.y - blockPoints[i].y]),
          blockPoints[0].x,
          blockPoints[0].y,
          [1, 1],
          'FD',
          true
        );

        // Draw grid lines inside block (8x4 grid pattern)
        const gridRows = 8;
        const gridCols = 4;

        // Draw uniform grid aligned with block edges
        pdf.setDrawColor(255, 255, 255);
        pdf.setLineWidth(0.4); // Make grid lines more visible

        // Assume blockPoints has 4 corners in order: [0]=top-left, [1]=top-right, [2]=bottom-right, [3]=bottom-left
        // Or it could be in any rotation, so we need to find the correct pairs
        if (blockPoints.length === 4) {
          // Find the two pairs of opposite edges
          // Use first and third point as one pair, second and fourth as another
          const p0 = blockPoints[0];
          const p1 = blockPoints[1];
          const p2 = blockPoints[2];
          const p3 = blockPoints[3];

          // Draw horizontal grid lines (interpolate between left and right edges)
          for (let i = 1; i < gridRows; i++) {
            const t = i / gridRows;
            // Interpolate along left edge (p0 to p3)
            const leftX = p0.x + (p3.x - p0.x) * t;
            const leftY = p0.y + (p3.y - p0.y) * t;
            // Interpolate along right edge (p1 to p2)
            const rightX = p1.x + (p2.x - p1.x) * t;
            const rightY = p1.y + (p2.y - p1.y) * t;
            // Draw line between these points
            pdf.line(leftX, leftY, rightX, rightY);
          }

          // Draw vertical grid lines (interpolate between top and bottom edges)
          for (let i = 1; i < gridCols; i++) {
            const t = i / gridCols;
            // Interpolate along top edge (p0 to p1)
            const topX = p0.x + (p1.x - p0.x) * t;
            const topY = p0.y + (p1.y - p0.y) * t;
            // Interpolate along bottom edge (p3 to p2)
            const bottomX = p3.x + (p2.x - p3.x) * t;
            const bottomY = p3.y + (p2.y - p3.y) * t;
            // Draw line between these points
            pdf.line(topX, topY, bottomX, bottomY);
          }
        }
      });
    }

    // Add structure label
    const centerX = gutterPoints.reduce((sum, p) => sum + p.x, 0) / gutterPoints.length;
    const centerY = gutterPoints.reduce((sum, p) => sum + p.y, 0) / gutterPoints.length;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 255); // Blue text
    pdf.text(`STRUCTURE-${String(index + 1).padStart(2, '0')}`, centerX, centerY, { align: 'center' });

    // Add dimensions (width x height in meters)
    const dimText = `${Math.round(polyhouse.dimensions.length)}x${Math.round(polyhouse.dimensions.width)}`;
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text(dimText, centerX, centerY + 3, { align: 'center' });
  });

  // Add "ROAD" markers if applicable (top of drawing)
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 140, 0); // Orange
  pdf.text('ROAD', startX + width / 2, startY - 3, { align: 'center' });
}

/**
 * Draw compass rose (N, S, E, W)
 */
function drawCompassRose(pdf: jsPDF, centerX: number, centerY: number) {
  const radius = 10;

  // Draw circle
  pdf.setDrawColor(0, 0, 0);
  pdf.setFillColor(255, 255, 255);
  pdf.setLineWidth(0.3);
  pdf.circle(centerX, centerY, radius);

  // Draw N-S line
  pdf.line(centerX, centerY - radius, centerX, centerY + radius);

  // Draw E-W line
  pdf.line(centerX - radius, centerY, centerX + radius, centerY);

  // Draw diagonal lines
  const diag = radius * 0.7;
  pdf.line(centerX - diag, centerY - diag, centerX + diag, centerY + diag);
  pdf.line(centerX - diag, centerY + diag, centerX + diag, centerY - diag);

  // Add N, S, E, W labels
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('N', centerX, centerY - radius - 2, { align: 'center' });
  pdf.text('S', centerX, centerY + radius + 4, { align: 'center' });
  pdf.text('E', centerX + radius + 3, centerY + 2, { align: 'center' });
  pdf.text('W', centerX - radius - 3, centerY + 2, { align: 'center' });
}

/**
 * Draw legend box with structure areas and grid info
 */
function drawLegendBox(
  pdf: jsPDF,
  startX: number,
  startY: number,
  width: number,
  height: number,
  data: TechnicalDrawingData
) {
  // Draw scalloped border (wavy edge)
  pdf.setDrawColor(0, 0, 0);
  pdf.setFillColor(255, 255, 255);
  pdf.setLineWidth(0.3);
  pdf.rect(startX, startY, width, height);

  let yPos = startY + 6;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);

  // Structure areas
  data.polyhouses.forEach((polyhouse, index) => {
    const area = Math.round(polyhouse.area);
    const dimText = `${Math.round(polyhouse.dimensions.length)}x${Math.round(polyhouse.dimensions.width)}`;
    pdf.text(
      `STRUCTURE-${String(index + 1).padStart(2, '0')} AREA:`,
      startX + 3,
      yPos
    );
    yPos += 4;
    pdf.text(
      `${dimText} = ${area} Sqm.`,
      startX + 6,
      yPos
    );
    yPos += 5;
  });

  yPos += 1;

  // Total area
  pdf.setFont('helvetica', 'bold');
  pdf.text(
    `TOTAL STRUCTURE`,
    startX + 3,
    yPos
  );
  yPos += 4;
  pdf.text(
    `(01-${String(data.polyhouseCount).padStart(2, '0')}) AREA =`,
    startX + 3,
    yPos
  );
  yPos += 4;
  pdf.text(
    `${Math.round(data.totalCoverageSqm).toLocaleString()} Sqm.`,
    startX + 3,
    yPos
  );

  yPos += 6;

  // Grid size info
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text(`Grid Size: 8 X 4`, startX + 3, yPos);
  yPos += 4;
  pdf.text(`Gable Length: -----`, startX + 3, yPos);
  yPos += 4;
  pdf.text(`Gutter Length: -----`, startX + 3, yPos);
}

/**
 * Draw title block with customer info and project details
 */
function drawTitleBlock(
  pdf: jsPDF,
  startX: number,
  startY: number,
  width: number,
  height: number,
  data: TechnicalDrawingData
) {
  // Outer border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(startX, startY, width, height);

  // Divide into sections
  pdf.line(startX, startY + 8, startX + width, startY + 8); // Horizontal line 1
  pdf.line(startX, startY + 16, startX + width, startY + 16); // Horizontal line 2
  pdf.line(startX, startY + 32, startX + width, startY + 32); // Horizontal line 3
  pdf.line(startX + 15, startY + 32, startX + 15, startY + height); // Vertical line for symbols

  // Customer info
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer:', startX + 2, startY + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.customerName, startX + 20, startY + 5);

  // Location
  pdf.setFont('helvetica', 'bold');
  pdf.text('Location:', startX + 2, startY + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.locationName, startX + 20, startY + 12);

  // Description
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description:', startX + 2, startY + 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('NVPH', startX + 20, startY + 20);

  // Project symbols (third angle projection)
  pdf.setFontSize(12);
  pdf.text('⊕', startX + 7, startY + 40);
  pdf.text('◁', startX + 12, startY + 40);

  // Type of house
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Type of House:', startX + 20, startY + 36);
  pdf.text('POLYHOUSE', startX + 38, startY + 36);

  // Date, Sheet, Rev table
  pdf.line(startX + 20, startY + 38, startX + width, startY + 38);

  pdf.setFontSize(6);
  pdf.text('Date:', startX + 20, startY + 41);
  pdf.text('Sheet:', startX + 30, startY + 41);
  pdf.text('of', startX + 40, startY + 41);
  pdf.text('Rev', startX + 48, startY + 41);

  const dateStr = new Date(data.createdAt).toLocaleDateString('en-GB');
  pdf.text(dateStr, startX + 20, startY + 44);
  pdf.text('1', startX + 30, startY + 44);
  pdf.text('1', startX + 40, startY + 44);
  pdf.text('1', startX + 48, startY + 44);

  // Bottom notes
  pdf.setFontSize(5);
  pdf.text('Third angle projection', startX + 2, startY + height - 1);
  pdf.text('All Dimensions are in "Meter"', startX + 25, startY + height - 1);
}

/**
 * Draw Agriplast branding
 * TODO: Add settings page to allow user to upload custom company logo
 */
function drawBranding(pdf: jsPDF, x: number, y: number) {
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(76, 175, 80);
  pdf.text('Agriplast', x + 2, y);
}

/**
 * Generate both quotation and technical drawing
 */
export async function generateProjectReports(data: TechnicalDrawingData & { quotation: any }): Promise<void> {
  try {
    console.log('📐 Generating technical drawing...');

    // Generate technical drawing
    const technicalDrawingBlob = await generateTechnicalDrawing(data);
    console.log('✓ Technical drawing generated, blob size:', technicalDrawingBlob.size, 'bytes');

    const technicalDrawingUrl = URL.createObjectURL(technicalDrawingBlob);

    // Download technical drawing - append to body for better compatibility
    const technicalLink = document.createElement('a');
    technicalLink.href = technicalDrawingUrl;
    technicalLink.download = `${data.projectName.replace(/\s+/g, '_')}_Technical_Drawing.pdf`;
    technicalLink.style.display = 'none';
    document.body.appendChild(technicalLink);
    technicalLink.click();
    document.body.removeChild(technicalLink);

    console.log('✓ Technical drawing download triggered');

    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(technicalDrawingUrl), 1000);

    // Wait a moment before generating second file
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log('📄 Generating quotation PDF...');

    // Import and generate quotation
    const { generateProjectPDF } = await import('./pdfExport');
    await generateProjectPDF({
      projectName: data.projectName,
      locationName: data.locationName,
      landAreaSqm: data.landAreaSqm,
      polyhouseCount: data.polyhouseCount,
      totalCoverageSqm: data.totalCoverageSqm,
      utilizationPercentage: data.utilizationPercentage,
      estimatedCost: data.quotation.totalCost,
      polyhouses: data.polyhouses,
      quotation: data.quotation,
      createdAt: data.createdAt,
    });

    console.log('✓ Both PDFs generated successfully');
  } catch (error) {
    console.error('❌ Error generating project reports:', error);
    throw error;
  }
}
