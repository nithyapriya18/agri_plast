/**
 * Agriplast Polyhouse Planning System - Shared Types
 * Domain-Specific Language (DSL) for polyhouse configuration
 */

// Geographic coordinates
export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Point {
  x: number;
  y: number;
}

// Land Area - the agricultural space mapped by the user
export interface LandArea {
  id: string;
  name: string;
  coordinates: Coordinate[]; // Polygon boundary
  centroid: Coordinate;
  area: number; // in square meters
  createdAt: Date;
}

// Block - Standard 8m x 4m composable unit
export interface Block {
  id: string;
  position: Point; // Top-left corner in local coordinate system
  width: number; // 8 meters (standard)
  height: number; // 4 meters (standard)
  rotation: number; // degrees from north
  corners: Point[]; // 4 corners of the rectangle
}

// Polyhouse - Rectangular greenhouse structure with industry-standard dimensions
export interface Polyhouse {
  id: string;
  label: string; // User-friendly label (A, B, C, ..., AA, AB, etc.)
  color: string; // Hex color for visualization (#4CAF50, etc.)
  blocks: Block[]; // 8x4m grid blocks inside the polyhouse

  // Professional polyhouse dimensions (industry standards)
  gableLength: number; // X direction (long side), multiples of 8m
  gutterWidth: number; // Y direction (short side), multiples of 4m
  rotation: number; // Angle in degrees (0-360)
  center: Coordinate; // Center point of the polyhouse

  bounds: Point[]; // Outer boundary corners
  area: number; // Total area (gableLength × gutterWidth)
  innerArea: number; // Area available for growing (same as area for rectangular polyhouses)
  dimensions: {
    length: number; // Gable length (X direction)
    width: number; // Gutter width (Y direction)
  };

  // Legacy field for backward compatibility
  orientation?: number; // degrees from north (0-360) - use rotation instead
}

// Corner types for polyhouse edges
export enum CornerType {
  INWARD_90 = '90',      // Inward-facing bend
  STRAIGHT_180 = '180',  // Straight connector
  OUTWARD_270 = '270'    // Outward-facing bend
}

export interface Corner {
  type: CornerType;
  position: Point;
  angle: number;
}

// DSL Configuration - The JSON structure passed to backend
export interface PolyhouseConfiguration {
  // Block specifications
  blockDimensions: {
    width: number;  // 8 meters (standard)
    height: number; // 4 meters (standard)
  };

  // Gutter specifications (no longer used - gutters are part of the 8x4 block structure)
  gutterWidth?: number; // DEPRECATED: Use gableLength/gutterWidth in Polyhouse instead

  // Spacing between polyhouses (corridors)
  polyhouseGap: number; // 2 meters (default) - walking corridors between structures

  // Safety buffer from land boundary
  safetyBuffer: number; // 1 meter (default) - prevents placement too close to edges

  // Polyhouse dimension constraints
  maxSideLength: number; // 100 meters (max length of one side)
  minSideLength: number; // 16 meters (minimum)

  // Corner constraints
  minCornerDistance: number; // 20 meters (minimum distance between corners)

  // Polyhouse block constraints
  minimumBlocksPerPolyhouse: number; // 10 blocks (default) - minimum number of blocks per polyhouse

  // Area constraints
  maxLandArea: number; // 1000 sqm (default)

  // Solar orientation constraints
  solarOrientation: {
    enabled: boolean;
    latitudeDegrees: number; // Latitude of land area
    allowedDeviationDegrees: number; // Calculated based on latitude
  };

  // Terrain constraints
  terrain: {
    considerSlope: boolean; // Whether to consider slope
    maxSlope: number; // Maximum allowed slope (degrees)
    landLevelingOverride: boolean; // User undertakes to level the land
    avoidWater: boolean; // Avoid building on water bodies
    ignoreRestrictedZones: boolean; // Override to build on restricted zones (user responsibility)
  };

  // User-specified non-buildable zones (wells, irrigation, etc.)
  userDefinedExclusions?: Array<{
    name: string; // e.g., "well", "irrigation tank", "storage shed"
    coordinates: Coordinate[]; // Polygon boundary (at least 3 points)
    reason: string; // Why this area is excluded
  }>;

  // Optimization goals
  optimization: {
    placementStrategy: 'maximize_blocks' | 'maximize_coverage' | 'balanced' | 'equal_area'; // Overall optimization goal
    minimizeCost: boolean; // Prefer simpler shapes
    preferLargerPolyhouses: boolean; // Fewer, larger polyhouses vs many small ones
    orientationStrategy: 'uniform' | 'varied' | 'optimized'; // How polyhouses should be oriented
    fillGapsWithSmallerPolyhouses: boolean; // Fill remaining gaps with smaller polyhouses (500-4000 sqm) after placing large ones
  };
}

// Copernicus data for elevation and land classification
export interface TerrainData {
  coordinates: Coordinate;
  elevation: number; // meters above sea level
  slope: number; // degrees
  landClassification: 'land' | 'water' | 'wetland' | 'vegetation';
}

// Material specifications for quotation
export enum MaterialType {
  PIPE = 'pipe',
  GUTTER = 'gutter',
  COVER = 'cover',
  CONNECTOR = 'connector',
  FOUNDATION = 'foundation'
}

export interface Material {
  id: string;
  type: MaterialType;
  name: string;
  description: string;
  unitPrice: number; // Price per unit
  unit: string; // 'meter', 'piece', 'sqm', etc.
  specifications: {
    [key: string]: string | number;
  };
}

export interface MaterialSelection {
  materialId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Quotation breakdown
export interface QuotationItem {
  category: string;
  description: string;
  materialSelections: MaterialSelection[];
  subtotal: number;
}

export interface Quotation {
  id: string;
  landAreaId: string;
  polyhouses: Polyhouse[];
  configuration: PolyhouseConfiguration;
  items: QuotationItem[];
  totalCost: number;
  totalArea: number; // Total polyhouse area
  createdAt: Date;
}

// Planning result from backend
export interface PlanningResult {
  success: boolean;
  landArea: LandArea;
  polyhouses: Polyhouse[];
  configuration: PolyhouseConfiguration;
  quotation: Quotation;
  warnings: string[];
  errors: string[];
  metadata: {
    numberOfPolyhouses: number;
    totalPolyhouseArea: number; // Inner area (blocks only for growing)
    totalPolyhouseAreaWithGutters?: number; // Total area including gutters (required space)
    totalLandArea: number;
    utilizationPercentage: number; // Based on totalPolyhouseAreaWithGutters
    computationTime: number; // milliseconds
    unbuildableRegions: Array<{
      reason: string; // e.g., "Steep slope", "Water body", "Safety buffer"
      affectedArea: number; // in square meters
      locationSample?: Coordinate; // Example location where this constraint applied
    }>;
    constraintViolations: Array<{
      type: 'corner_distance' | 'max_side_length' | 'min_side_length' | 'aspect_ratio' | 'gap';
      polyhouseId: string;
      severity: 'warning' | 'error';
      message: string;
    }>;
  };
  // Terrain analysis results
  terrainAnalysis?: {
    buildableAreaPercentage: number;
    averageSlope: number;
    elevationRange: { min: number; max: number };
    restrictedZones: Array<{
      type: string;
      coordinates: Coordinate[]; // For rendering on map
      area: number;
      reason: string;
      severity: string;
    }>;
    warnings: string[];
  };
  // Regulatory compliance results
  regulatoryCompliance?: {
    compliant: boolean;
    region: string;
    country: string;
    violations: Array<{
      severity: string;
      category: string;
      description: string;
      resolution: string;
    }>;
    warnings: Array<{
      category: string;
      description: string;
      recommendation: string;
    }>;
    permitsRequired: Array<{
      permit_type: string;
      authority: string;
      estimated_duration_days: number;
      estimated_cost: number;
    }>;
    estimatedComplianceCost: number;
    estimatedTimelineDays: number;
  };
}

// Conversational AI request/response
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ConversationRequest {
  planningResultId: string;
  message: string;
  conversationHistory: ConversationMessage[];
}

export interface ConversationResponse {
  message: string;
  updatedPlanningResult?: PlanningResult;
  requiresRecalculation: boolean;
}

// API Request/Response types
export interface CreatePlanRequest {
  landArea: {
    name: string;
    coordinates: Coordinate[];
  };
  configuration?: Partial<PolyhouseConfiguration>;
}

export interface CreatePlanResponse {
  planningResult: PlanningResult;
}

export interface UpdatePlanRequest {
  planningResultId: string;
  configuration?: Partial<PolyhouseConfiguration>;
  materialSelections?: {
    [itemCategory: string]: string[]; // material IDs
  };
}

export interface ChatRequest {
  planningResultId: string;
  message: string;
  conversationHistory: ConversationMessage[];
}

export interface ChatResponse {
  response: string;
  updatedPlanningResult?: PlanningResult;
}

// Polyhouse visualization constants
export const POLYHOUSE_COLORS = [
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#FFEB3B', // Yellow
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#F44336', // Red
  '#3F51B5', // Indigo
  '#009688', // Teal
];

// ===================================
// Conversational-First DSL Extensions
// ===================================

/**
 * Pricing preferences DSL
 * Defines user's pricing tier and customizations
 */
export interface PricingPreferences {
  tier: 'economy' | 'standard' | 'premium';
  customizations: Array<{
    category: string; // e.g., "structural", "covering", "irrigation"
    overrides: Record<string, number>; // Item name → custom price
  }>;
  businessSettings: {
    serviceChargePercent: number;
    profitMarginPercent: number;
    gstPercent: number;
    transportCostPerKmTon: number;
    installationLaborRate: number;
  };
}

/**
 * Design preferences DSL
 * Extracted from conversational history or forms
 */
export interface DesignPreferences {
  cropType: string; // e.g., "tomatoes", "cucumbers", "mixed"
  polyhouseSizePreference: 'large' | 'mixed' | 'small';
  automationRequired: boolean;
  vehicleAccessRequired: boolean;
  priority: 'coverage' | 'quality' | 'balanced';
  orientationPreference: 'uniform' | 'varied' | 'optimized';
  timeline: 'urgent' | 'planned';
}

/**
 * Learning profile DSL
 * AI-learned user preferences and patterns
 */
export interface LearningProfile {
  projectCount: number;
  commonPatterns: string[]; // Extracted preference patterns
  lastModified: Date;
  conversationInsights: string[]; // AI-learned insights from conversations
  preferredSettings?: Partial<PolyhouseConfiguration>; // Most commonly used settings
}

/**
 * Complete user preferences DSL
 * Combines all user configuration, pricing, design, and learning data
 */
export interface UserPreferencesDSL {
  userId: string;

  // Existing polyhouse configuration
  polyhouseConfig: PolyhouseConfiguration;

  // NEW: Pricing preferences
  pricingPreferences: PricingPreferences;

  // NEW: Design preferences
  designPreferences: DesignPreferences;

  // NEW: Learning profile
  learningProfile: LearningProfile;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number; // For tracking DSL version/schema changes
}

/**
 * Conversation context
 * Additional context passed to AI for better understanding
 */
export interface ConversationContext {
  currentPlan?: PlanningResult;
  userPreferences?: UserPreferencesDSL;
  recentProjects?: Array<{
    id: string;
    name: string;
    createdAt: Date;
    polyhouseCount: number;
    utilizationPercentage: number;
  }>;
  sessionStartTime: Date;
  conversationTurn: number;
}

/**
 * DSL view request
 * For viewing any part of the DSL via chat
 */
export interface DSLViewRequest {
  userId: string;
  section: 'pricing' | 'design' | 'learning' | 'polyhouse' | 'all';
}

/**
 * DSL update request
 * For updating DSL via conversational interface
 */
export interface DSLUpdateRequest {
  userId: string;
  section: 'pricing' | 'design' | 'learning' | 'polyhouse';
  updates: Partial<PricingPreferences | DesignPreferences | LearningProfile | PolyhouseConfiguration>;
  source: 'chat' | 'form' | 'api'; // Track how the update was made
}
