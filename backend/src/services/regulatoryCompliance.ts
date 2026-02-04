/**
 * Regulatory Compliance Service
 * Handles building codes, zoning, setbacks, permits, and local regulations
 * Location-aware rules for agricultural structures
 */

import { Coordinate } from '@shared/types';
import {
  INDIAN_REGIONS,
  INDIAN_BUILDING_CODES,
  INDIAN_SETBACKS,
  US_REGIONS,
  US_SETBACKS,
  EUROPEAN_REGIONS,
  EUROPEAN_SETBACKS,
  AUSTRALIAN_REGIONS,
  AUSTRALIAN_SETBACKS,
  getRegionByCoordinates,
  getRegionCount,
} from '../data/regionalRegulations';

export interface RegulatoryRegion {
  id: string;
  name: string;
  country: string;
  state?: string;
  district?: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface BuildingCode {
  code: string;
  name: string;
  description: string;
  authority: string;
  effectiveDate: string;
  rules: BuildingRule[];
}

export interface BuildingRule {
  id: string;
  category: 'setback' | 'height' | 'coverage' | 'spacing' | 'structural' | 'fire_safety' | 'drainage';
  requirement: string;
  value: number | string;
  unit?: string;
  mandatory: boolean;
  waivable: boolean;
  waiver_conditions?: string;
}

export interface ZoningRegulation {
  zone_type: string; // 'agricultural' | 'residential' | 'commercial' | 'industrial' | 'protected'
  permitted_uses: string[];
  prohibited_uses: string[];
  special_permits_required: string[];
  density_limits?: {
    max_coverage_percentage: number; // Max % of land that can be covered
    min_open_space_percentage: number; // Min % that must remain open
  };
}

export interface SetbackRequirements {
  from_property_boundary: number; // meters
  from_road: number; // meters
  from_water_body: number; // meters
  from_forest: number; // meters
  from_residential_area: number; // meters
  from_existing_structures: number; // meters
  from_utility_lines: number; // meters
}

export interface PermitRequirement {
  permit_type: string;
  required_for: string;
  authority: string;
  typical_duration_days: number;
  estimated_cost: number;
  documentation_required: string[];
}

export interface ComplianceCheckResult {
  compliant: boolean;
  violations: Violation[];
  warnings: Warning[];
  permits_required: PermitRequirement[];
  estimated_compliance_cost: number;
  estimated_timeline_days: number;
}

export interface Violation {
  rule_id: string;
  category: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  affected_area: Coordinate[];
  resolution: string;
  estimated_cost?: number;
}

export interface Warning {
  category: string;
  description: string;
  recommendation: string;
}

export class RegulatoryComplianceService {
  private regulationDatabase: Map<string, BuildingCode>;
  private zoningDatabase: Map<string, ZoningRegulation>;

  constructor() {
    this.regulationDatabase = new Map();
    this.zoningDatabase = new Map();
    this.initializeDatabase();

    // Log supported regions
    const regionCount = getRegionCount();
    console.log(`📍 Regulatory database initialized:`);
    console.log(`  ✓ ${regionCount.india} Indian states/territories`);
    console.log(`  ✓ ${regionCount.usa} US states`);
    console.log(`  ✓ ${regionCount.europe} European countries`);
    console.log(`  ✓ ${regionCount.australia} Australian states/territories`);
    console.log(`  ✓ ${regionCount.total} total regions supported`);
  }

  /**
   * Check regulatory compliance for a land area
   */
  async checkCompliance(
    coordinates: Coordinate[],
    proposedStructures: {
      area: number;
      perimeter: number;
      height?: number;
      purpose: string;
    }[]
  ): Promise<ComplianceCheckResult> {
    console.log('📋 Starting regulatory compliance check...');

    // Determine location and applicable regulations
    const region = await this.identifyRegion(coordinates);
    console.log(`  Location identified: ${region.name}, ${region.country}`);

    const buildingCode = this.getBuildingCode(region);
    const zoning = this.getZoning(region, coordinates);
    const setbacks = this.getSetbackRequirements(region);

    const violations: Violation[] = [];
    const warnings: Warning[] = [];
    const permitsRequired: PermitRequirement[] = [];

    // Check zoning compliance
    const zoningCheck = this.checkZoning(zoning, proposedStructures);
    violations.push(...zoningCheck.violations);
    warnings.push(...zoningCheck.warnings);

    // Check setback requirements
    const setbackCheck = this.checkSetbacks(coordinates, setbacks);
    violations.push(...setbackCheck.violations);
    warnings.push(...setbackCheck.warnings);

    // Check building code compliance
    const codeCheck = this.checkBuildingCode(buildingCode, proposedStructures, coordinates);
    violations.push(...codeCheck.violations);
    warnings.push(...codeCheck.warnings);

    // Determine required permits
    permitsRequired.push(...this.determinePermits(region, proposedStructures));

    // Calculate compliance costs and timeline
    const estimatedCost = this.calculateComplianceCost(violations, permitsRequired);
    const estimatedTimeline = this.calculateTimeline(permitsRequired, violations);

    const compliant = violations.filter(v => v.severity === 'critical').length === 0;

    console.log(`✓ Compliance check complete: ${compliant ? 'COMPLIANT' : 'VIOLATIONS FOUND'}`);
    if (violations.length > 0) {
      console.log(`  ⚠ ${violations.length} violations found`);
    }
    if (permitsRequired.length > 0) {
      console.log(`  📄 ${permitsRequired.length} permits required`);
    }

    return {
      compliant,
      violations,
      warnings,
      permits_required: permitsRequired,
      estimated_compliance_cost: estimatedCost,
      estimated_timeline_days: estimatedTimeline,
    };
  }

  /**
   * Identify region from coordinates using reverse geocoding
   */
  private async identifyRegion(coordinates: Coordinate[]): Promise<RegulatoryRegion> {
    // Calculate centroid
    const lat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
    const lng = coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length;

    console.log(`  Location: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);

    // Try Mapbox reverse geocoding for accurate location identification
    try {
      const mapboxToken = process.env.MAPBOX_TOKEN;
      if (mapboxToken) {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=region,country`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            // Extract state/region and country from the response
            let stateName = '';
            let countryName = '';

            for (const feature of data.features) {
              if (feature.place_type.includes('region') && !stateName) {
                stateName = feature.text;
              }
              if (feature.place_type.includes('country') && !countryName) {
                countryName = feature.text;
              }
            }

            if (stateName && countryName) {
              console.log(`  Reverse geocoded: ${stateName}, ${countryName}`);

              // Try to match with our database
              const region = this.findRegionByName(stateName, countryName);
              if (region) {
                console.log(`  Building codes: ${region.name}, ${region.country}`);
                return region;
              }

              // Create a custom region with the geocoded information
              return {
                id: `custom-${stateName.toLowerCase().replace(/\s+/g, '-')}`,
                name: stateName,
                country: countryName,
                state: stateName,
                bounds: { north: lat + 1, south: lat - 1, east: lng + 1, west: lng - 1 },
              };
            }
          }
        }
      }
    } catch (error) {
      console.warn('  Reverse geocoding failed, falling back to bounding box method:', error);
    }

    // Fallback: Use comprehensive regional database with bounding boxes
    const region = getRegionByCoordinates(lat, lng);

    if (region) {
      console.log(`  Building codes (bounding box): ${region.name}, ${region.country}`);
      return region;
    }

    // Final fallback: Generic agricultural zone (no specific local regulations)
    console.log(`  Using standard agricultural regulations`);
    return {
      id: 'generic',
      name: 'Standard Agricultural Zone',
      country: 'Generic',
      bounds: { north: lat + 1, south: lat - 1, east: lng + 1, west: lng - 1 },
    };
  }

  /**
   * Find region in our database by name
   */
  private findRegionByName(stateName: string, countryName: string): RegulatoryRegion | null {
    // Normalize names for comparison
    const normalizeState = stateName.toLowerCase().trim();
    const normalizeCountry = countryName.toLowerCase().trim();

    // Check all region maps
    const allRegions = [
      ...Array.from(INDIAN_REGIONS.values()),
      ...Array.from(US_REGIONS.values()),
      ...Array.from(EUROPEAN_REGIONS.values()),
      ...Array.from(AUSTRALIAN_REGIONS.values()),
    ];

    for (const region of allRegions) {
      const regionStateName = (region.state || region.name).toLowerCase().trim();
      const regionCountryName = region.country.toLowerCase().trim();

      // Match both state and country
      if (regionStateName === normalizeState ||
          (regionStateName.includes(normalizeState) || normalizeState.includes(regionStateName))) {
        if (regionCountryName.includes(normalizeCountry) || normalizeCountry.includes(regionCountryName)) {
          return region;
        }
      }
    }

    return null;
  }

  /**
   * Get Indian region regulations
   */
  private getIndianRegion(lat: number, lng: number): RegulatoryRegion {
    // Karnataka (Bangalore: 12.97°N, 77.59°E) - CHECK FIRST to avoid Tamil Nadu overlap
    if (lat >= 11.5 && lat <= 18.5 && lng >= 74 && lng <= 78.6) {
      return {
        id: 'IN-KA',
        name: 'Karnataka',
        country: 'India',
        state: 'Karnataka',
        bounds: { north: 18.5, south: 11.5, east: 78.6, west: 74 },
      };
    }

    // Tamil Nadu (Chennai: 13.08°N, 80.27°E) - Non-overlapping bounds
    if (lat >= 8 && lat <= 13.5 && lng >= 78.7 && lng <= 81) {
      return {
        id: 'IN-TN',
        name: 'Tamil Nadu',
        country: 'India',
        state: 'Tamil Nadu',
        bounds: { north: 13.5, south: 8, east: 81, west: 78.7 },
      };
    }

    // Default India
    return {
      id: 'IN',
      name: 'India',
      country: 'India',
      bounds: { north: 38, south: 6, east: 97, west: 68 },
    };
  }

  /**
   * Get US region regulations
   */
  private getUSRegion(lat: number, lng: number): RegulatoryRegion {
    // California
    if (lat >= 32 && lat <= 42 && lng >= -125 && lng <= -114) {
      return {
        id: 'US-CA',
        name: 'California',
        country: 'USA',
        state: 'California',
        bounds: { north: 42, south: 32, east: -114, west: -125 },
      };
    }

    // Default USA
    return {
      id: 'US',
      name: 'United States',
      country: 'USA',
      bounds: { north: 49, south: 24, east: -66, west: -125 },
    };
  }

  /**
   * Get European region regulations
   */
  private getEuropeanRegion(lat: number, lng: number): RegulatoryRegion {
    // Netherlands (example)
    if (lat >= 50.5 && lat <= 53.5 && lng >= 3 && lng <= 7.5) {
      return {
        id: 'NL',
        name: 'Netherlands',
        country: 'Netherlands',
        bounds: { north: 53.5, south: 50.5, east: 7.5, west: 3 },
      };
    }

    // Default Europe
    return {
      id: 'EU',
      name: 'Europe',
      country: 'Europe',
      bounds: { north: 71, south: 35, east: 40, west: -10 },
    };
  }

  /**
   * Get building code for region
   */
  private getBuildingCode(region: RegulatoryRegion): BuildingCode {
    return this.regulationDatabase.get(region.id) || this.getDefaultBuildingCode();
  }

  /**
   * Get zoning regulations for region
   */
  private getZoning(region: RegulatoryRegion, coordinates: Coordinate[]): ZoningRegulation {
    // For agricultural land, typically 'agricultural' zoning
    const key = `${region.id}-agricultural`;
    return this.zoningDatabase.get(key) || {
      zone_type: 'agricultural',
      permitted_uses: ['farming', 'greenhouse', 'polyhouse', 'storage', 'farm_equipment'],
      prohibited_uses: ['residential', 'commercial', 'industrial'],
      special_permits_required: [],
      density_limits: {
        max_coverage_percentage: 70, // Max 70% coverage in agricultural zones
        min_open_space_percentage: 30, // Min 30% open space
      },
    };
  }

  /**
   * Get setback requirements for region from comprehensive database
   */
  private getSetbackRequirements(region: RegulatoryRegion): SetbackRequirements {
    // Check Australian setbacks
    const australianSetback = AUSTRALIAN_SETBACKS.get(region.id);
    if (australianSetback) return australianSetback;

    // Check Indian setbacks
    const indianSetback = INDIAN_SETBACKS.get(region.id);
    if (indianSetback) return indianSetback;

    // Check US setbacks
    const usSetback = US_SETBACKS.get(region.id);
    if (usSetback) return usSetback;

    // Check European setbacks
    const europeanSetback = EUROPEAN_SETBACKS.get(region.id);
    if (europeanSetback) return europeanSetback;

    // Default agricultural setbacks
    return {
      from_property_boundary: 5,
      from_road: 10,
      from_water_body: 15,
      from_forest: 20,
      from_residential_area: 10,
      from_existing_structures: 5,
      from_utility_lines: 10,
    };
  }

  /**
   * Check zoning compliance
   */
  private checkZoning(
    zoning: ZoningRegulation,
    structures: { area: number }[]
  ): { violations: Violation[]; warnings: Warning[] } {
    const violations: Violation[] = [];
    const warnings: Warning[] = [];

    // Check coverage limits
    const totalArea = structures.reduce((sum, s) => sum + s.area, 0);
    // Note: Would need land area to check percentage - assuming passed separately

    return { violations, warnings };
  }

  /**
   * Check setback requirements
   */
  private checkSetbacks(
    coordinates: Coordinate[],
    setbacks: SetbackRequirements
  ): { violations: Violation[]; warnings: Warning[] } {
    const violations: Violation[] = [];
    const warnings: Warning[] = [];

    // Check if structures respect setbacks
    // This is simplified - real implementation would check actual distances
    warnings.push({
      category: 'setback',
      description: `Maintain ${setbacks.from_property_boundary}m setback from property boundaries`,
      recommendation: 'Polyhouses will be placed with appropriate boundary buffers',
    });

    if (setbacks.from_water_body > 10) {
      warnings.push({
        category: 'setback',
        description: `Water bodies require ${setbacks.from_water_body}m setback`,
        recommendation: 'System will automatically avoid water bodies with required buffer',
      });
    }

    return { violations, warnings };
  }

  /**
   * Check building code compliance
   */
  private checkBuildingCode(
    code: BuildingCode,
    structures: { area: number; height?: number }[],
    coordinates: Coordinate[]
  ): { violations: Violation[]; warnings: Warning[] } {
    const violations: Violation[] = [];
    const warnings: Warning[] = [];

    // Check structural requirements
    for (const rule of code.rules) {
      if (rule.mandatory) {
        warnings.push({
          category: rule.category,
          description: rule.requirement,
          recommendation: `Ensure compliance with ${code.code} ${rule.id}: ${rule.requirement}`,
        });
      }
    }

    return { violations, warnings };
  }

  /**
   * Determine required permits
   */
  private determinePermits(
    region: RegulatoryRegion,
    structures: { area: number; purpose: string }[]
  ): PermitRequirement[] {
    const permits: PermitRequirement[] = [];

    // Agricultural structure permit (India)
    if (region.country === 'India') {
      permits.push({
        permit_type: 'Agricultural Structure Permit',
        required_for: 'Polyhouse construction on agricultural land',
        authority: `${region.state || region.name} Agricultural Department`,
        typical_duration_days: 30,
        estimated_cost: 5000, // INR
        documentation_required: [
          'Land ownership documents',
          'Site plan',
          'Structure specifications',
          'NOC from local panchayat/municipality',
        ],
      });

      // Environmental clearance for large projects
      const totalArea = structures.reduce((sum, s) => sum + s.area, 0);
      if (totalArea > 5000) {
        permits.push({
          permit_type: 'Environmental Clearance',
          required_for: 'Large agricultural projects (>5000 sqm)',
          authority: 'State Environment Impact Assessment Authority',
          typical_duration_days: 90,
          estimated_cost: 25000, // INR
          documentation_required: [
            'Environmental Impact Assessment Report',
            'Project proposal',
            'Public consultation records',
          ],
        });
      }
    }

    // Building permit (USA)
    if (region.country === 'USA') {
      permits.push({
        permit_type: 'Agricultural Building Permit',
        required_for: 'Greenhouse/polyhouse structures',
        authority: `${region.state || region.name} County Planning Department`,
        typical_duration_days: 45,
        estimated_cost: 500, // USD
        documentation_required: [
          'Plot plan',
          'Building plans and specifications',
          'Structural engineering certification',
        ],
      });
    }

    // Building permit (Australia)
    if (region.country === 'Australia') {
      permits.push({
        permit_type: 'Agricultural Building Permit',
        required_for: 'Polyhouse/greenhouse construction',
        authority: `${region.state || region.name} Local Council`,
        typical_duration_days: 30,
        estimated_cost: 800, // AUD
        documentation_required: [
          'Site plan',
          'Building specifications',
          'Land title documents',
          'Development application',
        ],
      });

      // Environmental assessment for large projects
      const totalArea = structures.reduce((sum, s) => sum + s.area, 0);
      if (totalArea > 3000) {
        permits.push({
          permit_type: 'Environmental Impact Assessment',
          required_for: 'Large-scale agricultural development (>3000 sqm)',
          authority: `${region.state} Environment Protection Authority`,
          typical_duration_days: 60,
          estimated_cost: 5000, // AUD
          documentation_required: [
            'Environmental impact statement',
            'Flora and fauna assessment',
            'Water management plan',
          ],
        });
      }
    }

    return permits;
  }

  /**
   * Calculate estimated compliance costs
   */
  private calculateComplianceCost(
    violations: Violation[],
    permits: PermitRequirement[]
  ): number {
    let totalCost = 0;

    // Violation resolution costs
    for (const violation of violations) {
      if (violation.estimated_cost) {
        totalCost += violation.estimated_cost;
      }
    }

    // Permit costs
    for (const permit of permits) {
      totalCost += permit.estimated_cost;
    }

    return totalCost;
  }

  /**
   * Calculate estimated timeline
   */
  private calculateTimeline(
    permits: PermitRequirement[],
    violations: Violation[]
  ): number {
    if (permits.length === 0) return 0;

    // Permits often run in parallel, so use max duration
    const maxPermitDuration = Math.max(...permits.map(p => p.typical_duration_days));

    // Add time for violation resolution if any critical violations
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const violationResolutionDays = criticalViolations * 15; // 15 days per critical violation

    return maxPermitDuration + violationResolutionDays;
  }

  /**
   * Initialize regulations database
   */
  private initializeDatabase(): void {
    // India - Tamil Nadu regulations
    this.regulationDatabase.set('IN-TN', {
      code: 'TN-AGR-2020',
      name: 'Tamil Nadu Agricultural Structures Code 2020',
      description: 'Building code for agricultural structures in Tamil Nadu',
      authority: 'Tamil Nadu Agricultural Department',
      effectiveDate: '2020-01-01',
      rules: [
        {
          id: 'TN-AGR-001',
          category: 'setback',
          requirement: 'Minimum 3m setback from property boundary',
          value: 3,
          unit: 'meters',
          mandatory: true,
          waivable: false,
        },
        {
          id: 'TN-AGR-002',
          category: 'height',
          requirement: 'Maximum height 8m for polyhouse structures',
          value: 8,
          unit: 'meters',
          mandatory: true,
          waivable: false,
        },
        {
          id: 'TN-AGR-003',
          category: 'drainage',
          requirement: 'Adequate drainage system required for rainwater management',
          value: 'required',
          mandatory: true,
          waivable: false,
        },
        {
          id: 'TN-AGR-004',
          category: 'fire_safety',
          requirement: 'Fire extinguishers required for structures >500 sqm',
          value: 500,
          unit: 'sqm',
          mandatory: true,
          waivable: false,
        },
      ],
    });

    // Default building code
    this.regulationDatabase.set('generic', this.getDefaultBuildingCode());

    // Zoning regulations
    this.zoningDatabase.set('IN-TN-agricultural', {
      zone_type: 'agricultural',
      permitted_uses: ['farming', 'greenhouse', 'polyhouse', 'storage', 'farm_equipment', 'irrigation'],
      prohibited_uses: ['residential_construction', 'commercial_establishment', 'industrial_facility'],
      special_permits_required: ['large_scale_farming'],
      density_limits: {
        max_coverage_percentage: 70,
        min_open_space_percentage: 30,
      },
    });
  }

  /**
   * Get default building code (fallback)
   */
  private getDefaultBuildingCode(): BuildingCode {
    return {
      code: 'DEFAULT-AGR',
      name: 'Default Agricultural Building Code',
      description: 'Generic agricultural structure requirements',
      authority: 'General Agricultural Standards',
      effectiveDate: '2020-01-01',
      rules: [
        {
          id: 'DEFAULT-001',
          category: 'setback',
          requirement: 'Minimum 5m setback from property boundaries',
          value: 5,
          unit: 'meters',
          mandatory: true,
          waivable: false,
        },
        {
          id: 'DEFAULT-002',
          category: 'structural',
          requirement: 'Structures must withstand local wind loads',
          value: 'required',
          mandatory: true,
          waivable: false,
        },
      ],
    };
  }
}
