/**
 * Comprehensive Agriplast Pricing Configuration
 * All costs involved in polyhouse construction business
 * Prices in INR (Indian Rupees)
 */

export type PricingTier = 'economy' | 'standard' | 'premium';

export interface MaterialPrice {
  economy: number;
  standard: number;
  premium: number;
  unit: string;
  description: string;
}

export interface PricingConfiguration {
  // STRUCTURE MATERIALS
  structure: {
    giPipeMain: MaterialPrice;           // Main frame GI pipes (80mm diameter)
    giPipeSecondary: MaterialPrice;      // Secondary frame GI pipes (50mm)
    giPipePurlins: MaterialPrice;        // Purlins/cross members (25mm)
    boltsAndClamps: MaterialPrice;       // Fasteners per sqm
    foundation: MaterialPrice;           // Concrete foundation per sqm
    anchorsAndBases: MaterialPrice;      // Ground anchors per unit
  };

  // COVERING MATERIALS
  covering: {
    plasticFilm200micron: MaterialPrice;  // Standard 200 micron UV film
    plasticFilm150micron: MaterialPrice;  // Economy 150 micron
    uvStabilizedSheet: MaterialPrice;     // Premium UV stabilized
    shadeNet50: MaterialPrice;            // 50% shade net
    shadeNet75: MaterialPrice;            // 75% shade net
    insectNet40mesh: MaterialPrice;       // 40 mesh insect protection
    antiDripFilm: MaterialPrice;          // Anti-condensation film
  };

  // CLIMATE CONTROL
  climateControl: {
    naturalVentilation: MaterialPrice;    // Basic vents per sqm
    fanSystem: MaterialPrice;             // Exhaust fans per sqm
    coolingPads: MaterialPrice;           // Evaporative cooling pads
    foggerSystem: MaterialPrice;          // Fogging system per sqm
    heatingSystem: MaterialPrice;         // Optional heating per sqm
    thermostat: MaterialPrice;            // Temperature controller
    humidityController: MaterialPrice;    // Humidity sensor/controller
  };

  // IRRIGATION SYSTEMS
  irrigation: {
    dripLineBasic: MaterialPrice;         // Basic drip line per meter
    dripLineInline: MaterialPrice;        // Inline drip with emitters
    sprinklerSystem: MaterialPrice;       // Overhead sprinklers per sqm
    mainPipePVC: MaterialPrice;           // Main PVC pipes per meter
    lateralPipes: MaterialPrice;          // Lateral distribution pipes
    filterSystem: MaterialPrice;          // Water filtration unit
    pumpSmall: MaterialPrice;             // 0.5 HP pump
    pumpMedium: MaterialPrice;            // 1 HP pump
    pumpLarge: MaterialPrice;             // 2 HP pump
    fertilizerInjector: MaterialPrice;    // Fertilizer injection system
    valvesAndFittings: MaterialPrice;     // Valves, connectors per unit
  };

  // FLOORING & INTERNAL
  flooring: {
    mulchFilm: MaterialPrice;             // Ground mulch film per sqm
    weedMatFabric: MaterialPrice;         // Weed control fabric
    concreteFlooring: MaterialPrice;      // Concrete pathways per sqm
    gravelFlooring: MaterialPrice;        // Gravel flooring per sqm
    growingBenches: MaterialPrice;        // Optional raised benches per sqm
    trellisSupport: MaterialPrice;        // Vertical support system
  };

  // DOORS & ACCESS
  access: {
    doorSingle: MaterialPrice;            // Single door (3x7 ft)
    doorDouble: MaterialPrice;            // Double door (6x7 ft)
    rollupDoor: MaterialPrice;            // Roll-up door per sqm
    windowVents: MaterialPrice;           // Side/roof vents each
    insectScreenDoor: MaterialPrice;      // Insect mesh door
  };

  // AUTOMATION (OPTIONAL)
  automation: {
    basicController: MaterialPrice;        // Basic timer controller
    smartController: MaterialPrice;        // IoT-enabled controller
    soilMoistureSensor: MaterialPrice;     // Per sensor
    temperatureSensor: MaterialPrice;      // Per sensor
    humiditySensor: MaterialPrice;         // Per sensor
    lightSensor: MaterialPrice;            // Per sensor
    motorizedVentilation: MaterialPrice;   // Automated vent openers
    weatherStation: MaterialPrice;         // Complete weather station
  };

  // LABOR & SERVICES
  labor: {
    designFee: MaterialPrice;              // Per project (percentage or flat)
    engineeringFee: MaterialPrice;         // Structural engineering
    installationPerSqm: MaterialPrice;     // Installation labor per sqm
    electricalWork: MaterialPrice;         // Electrical installation per sqm
    plumbingWork: MaterialPrice;           // Plumbing/irrigation setup
    supervisorPerDay: MaterialPrice;       // Site supervisor daily rate
    workerPerDay: MaterialPrice;           // General worker daily rate
    skilledWorkerPerDay: MaterialPrice;    // Skilled technician daily rate
  };

  // TRANSPORTATION & LOGISTICS
  logistics: {
    transportationPerKm: MaterialPrice;    // Per km per ton
    loadingUnloading: MaterialPrice;       // Per ton
    storagePerDay: MaterialPrice;          // Material storage if needed
    cranageIfNeeded: MaterialPrice;        // Crane rental per day
  };

  // BUSINESS COSTS
  business: {
    serviceCharge: MaterialPrice;          // Service fee (% of material cost)
    profitMargin: MaterialPrice;           // Profit margin (% of total)
    gstTax: MaterialPrice;                 // GST (% of subtotal)
    warrantyExtended: MaterialPrice;       // Extended warranty cost
    maintenanceAnnual: MaterialPrice;      // Annual maintenance per sqm
    insuranceOptional: MaterialPrice;      // Insurance per sqm per year
  };

  // MISCELLANEOUS
  miscellaneous: {
    wireAndCables: MaterialPrice;          // Electrical wiring per meter
    paintingCoating: MaterialPrice;        // Protective coating per sqm
    signageBoard: MaterialPrice;           // Company signage per board
    tools: MaterialPrice;                  // Tool rental/usage per project
    safetyEquipment: MaterialPrice;        // Safety gear per worker
    wastageContingency: MaterialPrice;     // Material wastage buffer (%)
  };
}

/**
 * Default Agriplast Pricing Configuration
 * Based on market research for Indian polyhouse construction (2025)
 */
export const DEFAULT_PRICING: PricingConfiguration = {
  // STRUCTURE MATERIALS (INR)
  structure: {
    giPipeMain: {
      economy: 280,
      standard: 350,
      premium: 450,
      unit: '₹/meter',
      description: 'Main frame GI pipes - 80mm diameter, galvanized',
    },
    giPipeSecondary: {
      economy: 180,
      standard: 220,
      premium: 280,
      unit: '₹/meter',
      description: 'Secondary frame GI pipes - 50mm diameter',
    },
    giPipePurlins: {
      economy: 90,
      standard: 120,
      premium: 160,
      unit: '₹/meter',
      description: 'Purlins and cross members - 25mm diameter',
    },
    boltsAndClamps: {
      economy: 25,
      standard: 35,
      premium: 50,
      unit: '₹/sqm',
      description: 'Fasteners, bolts, clamps per sqm of structure',
    },
    foundation: {
      economy: 120,
      standard: 180,
      premium: 280,
      unit: '₹/sqm',
      description: 'Concrete foundation with anchors',
    },
    anchorsAndBases: {
      economy: 150,
      standard: 250,
      premium: 400,
      unit: '₹/piece',
      description: 'Ground anchors and base plates',
    },
  },

  // COVERING MATERIALS
  covering: {
    plasticFilm200micron: {
      economy: 40,
      standard: 55,
      premium: 75,
      unit: '₹/sqm',
      description: 'Standard 200 micron UV-treated plastic film',
    },
    plasticFilm150micron: {
      economy: 28,
      standard: 38,
      premium: 50,
      unit: '₹/sqm',
      description: 'Economy 150 micron plastic film',
    },
    uvStabilizedSheet: {
      economy: 65,
      standard: 90,
      premium: 130,
      unit: '₹/sqm',
      description: 'Premium UV-stabilized polycarbonate sheets',
    },
    shadeNet50: {
      economy: 18,
      standard: 28,
      premium: 40,
      unit: '₹/sqm',
      description: '50% shade net - HDPE material',
    },
    shadeNet75: {
      economy: 22,
      standard: 32,
      premium: 48,
      unit: '₹/sqm',
      description: '75% shade net - UV stabilized',
    },
    insectNet40mesh: {
      economy: 35,
      standard: 50,
      premium: 70,
      unit: '₹/sqm',
      description: '40 mesh insect protection net',
    },
    antiDripFilm: {
      economy: 55,
      standard: 75,
      premium: 100,
      unit: '₹/sqm',
      description: 'Anti-condensation drip film',
    },
  },

  // CLIMATE CONTROL
  climateControl: {
    naturalVentilation: {
      economy: 15,
      standard: 25,
      premium: 40,
      unit: '₹/sqm',
      description: 'Natural ventilation openings with screens',
    },
    fanSystem: {
      economy: 45,
      standard: 65,
      premium: 95,
      unit: '₹/sqm',
      description: 'Exhaust fan system with controls',
    },
    coolingPads: {
      economy: 80,
      standard: 120,
      premium: 180,
      unit: '₹/sqm',
      description: 'Evaporative cooling pad system',
    },
    foggerSystem: {
      economy: 60,
      standard: 90,
      premium: 140,
      unit: '₹/sqm',
      description: 'High-pressure fogging system',
    },
    heatingSystem: {
      economy: 100,
      standard: 150,
      premium: 250,
      unit: '₹/sqm',
      description: 'Heating system for cold climates',
    },
    thermostat: {
      economy: 2500,
      standard: 5000,
      premium: 12000,
      unit: '₹/unit',
      description: 'Temperature control system',
    },
    humidityController: {
      economy: 3000,
      standard: 6000,
      premium: 15000,
      unit: '₹/unit',
      description: 'Humidity sensor and controller',
    },
  },

  // IRRIGATION
  irrigation: {
    dripLineBasic: {
      economy: 8,
      standard: 12,
      premium: 18,
      unit: '₹/meter',
      description: 'Basic inline drip tape',
    },
    dripLineInline: {
      economy: 15,
      standard: 22,
      premium: 32,
      unit: '₹/meter',
      description: 'Pressure-compensated inline drippers',
    },
    sprinklerSystem: {
      economy: 35,
      standard: 55,
      premium: 85,
      unit: '₹/sqm',
      description: 'Overhead sprinkler irrigation',
    },
    mainPipePVC: {
      economy: 45,
      standard: 65,
      premium: 95,
      unit: '₹/meter',
      description: 'Main PVC supply pipes (63mm)',
    },
    lateralPipes: {
      economy: 18,
      standard: 28,
      premium: 40,
      unit: '₹/meter',
      description: 'Lateral distribution LDPE pipes',
    },
    filterSystem: {
      economy: 8000,
      standard: 15000,
      premium: 30000,
      unit: '₹/unit',
      description: 'Sand filter or screen filter system',
    },
    pumpSmall: {
      economy: 6000,
      standard: 9000,
      premium: 15000,
      unit: '₹/unit',
      description: '0.5 HP water pump',
    },
    pumpMedium: {
      economy: 10000,
      standard: 15000,
      premium: 25000,
      unit: '₹/unit',
      description: '1 HP water pump',
    },
    pumpLarge: {
      economy: 18000,
      standard: 28000,
      premium: 45000,
      unit: '₹/unit',
      description: '2 HP water pump',
    },
    fertilizerInjector: {
      economy: 12000,
      standard: 25000,
      premium: 50000,
      unit: '₹/unit',
      description: 'Venturi or dosing pump fertilizer injector',
    },
    valvesAndFittings: {
      economy: 20,
      standard: 35,
      premium: 55,
      unit: '₹/unit',
      description: 'Valves, connectors, elbows, tees',
    },
  },

  // FLOORING
  flooring: {
    mulchFilm: {
      economy: 12,
      standard: 18,
      premium: 28,
      unit: '₹/sqm',
      description: 'Ground mulch plastic film',
    },
    weedMatFabric: {
      economy: 25,
      standard: 40,
      premium: 60,
      unit: '₹/sqm',
      description: 'Weed control geotextile fabric',
    },
    concreteFlooring: {
      economy: 180,
      standard: 280,
      premium: 450,
      unit: '₹/sqm',
      description: 'Concrete pathways and flooring',
    },
    gravelFlooring: {
      economy: 45,
      standard: 65,
      premium: 95,
      unit: '₹/sqm',
      description: 'Gravel or stone flooring',
    },
    growingBenches: {
      economy: 350,
      standard: 550,
      premium: 850,
      unit: '₹/sqm',
      description: 'Raised growing benches/tables',
    },
    trellisSupport: {
      economy: 35,
      standard: 55,
      premium: 85,
      unit: '₹/sqm',
      description: 'Vertical crop support system',
    },
  },

  // ACCESS
  access: {
    doorSingle: {
      economy: 4500,
      standard: 7500,
      premium: 12000,
      unit: '₹/unit',
      description: 'Single door 3ft x 7ft with frame',
    },
    doorDouble: {
      economy: 8000,
      standard: 13000,
      premium: 20000,
      unit: '₹/unit',
      description: 'Double door 6ft x 7ft with frame',
    },
    rollupDoor: {
      economy: 450,
      standard: 700,
      premium: 1100,
      unit: '₹/sqm',
      description: 'Roll-up side curtain door',
    },
    windowVents: {
      economy: 2500,
      standard: 4000,
      premium: 6500,
      unit: '₹/unit',
      description: 'Side or roof ventilation windows',
    },
    insectScreenDoor: {
      economy: 5500,
      standard: 8500,
      premium: 13000,
      unit: '₹/unit',
      description: 'Insect mesh entry door',
    },
  },

  // AUTOMATION
  automation: {
    basicController: {
      economy: 8000,
      standard: 15000,
      premium: 28000,
      unit: '₹/unit',
      description: 'Basic timer and relay controller',
    },
    smartController: {
      economy: 25000,
      standard: 50000,
      premium: 100000,
      unit: '₹/unit',
      description: 'IoT-enabled smart climate controller',
    },
    soilMoistureSensor: {
      economy: 800,
      standard: 1500,
      premium: 3000,
      unit: '₹/unit',
      description: 'Soil moisture sensor probe',
    },
    temperatureSensor: {
      economy: 600,
      standard: 1200,
      premium: 2500,
      unit: '₹/unit',
      description: 'Digital temperature sensor',
    },
    humiditySensor: {
      economy: 1000,
      standard: 2000,
      premium: 4000,
      unit: '₹/unit',
      description: 'Humidity sensor (RH%)',
    },
    lightSensor: {
      economy: 1500,
      standard: 3000,
      premium: 6000,
      unit: '₹/unit',
      description: 'PAR/Light intensity sensor',
    },
    motorizedVentilation: {
      economy: 15000,
      standard: 28000,
      premium: 50000,
      unit: '₹/unit',
      description: 'Automated vent opener system',
    },
    weatherStation: {
      economy: 35000,
      standard: 70000,
      premium: 150000,
      unit: '₹/unit',
      description: 'Complete weather monitoring station',
    },
  },

  // LABOR
  labor: {
    designFee: {
      economy: 5000,
      standard: 12000,
      premium: 25000,
      unit: '₹/project',
      description: 'Design and layout planning fee',
    },
    engineeringFee: {
      economy: 8000,
      standard: 18000,
      premium: 35000,
      unit: '₹/project',
      description: 'Structural engineering certification',
    },
    installationPerSqm: {
      economy: 45,
      standard: 75,
      premium: 120,
      unit: '₹/sqm',
      description: 'Installation labor cost per sqm',
    },
    electricalWork: {
      economy: 25,
      standard: 40,
      premium: 65,
      unit: '₹/sqm',
      description: 'Electrical wiring and setup',
    },
    plumbingWork: {
      economy: 30,
      standard: 50,
      premium: 80,
      unit: '₹/sqm',
      description: 'Irrigation plumbing installation',
    },
    supervisorPerDay: {
      economy: 1200,
      standard: 1800,
      premium: 2500,
      unit: '₹/day',
      description: 'Site supervisor daily rate',
    },
    workerPerDay: {
      economy: 500,
      standard: 700,
      premium: 900,
      unit: '₹/day',
      description: 'General laborer daily wage',
    },
    skilledWorkerPerDay: {
      economy: 800,
      standard: 1200,
      premium: 1600,
      unit: '₹/day',
      description: 'Skilled technician daily rate',
    },
  },

  // LOGISTICS
  logistics: {
    transportationPerKm: {
      economy: 12,
      standard: 18,
      premium: 28,
      unit: '₹/km/ton',
      description: 'Material transportation cost',
    },
    loadingUnloading: {
      economy: 800,
      standard: 1500,
      premium: 2500,
      unit: '₹/ton',
      description: 'Loading and unloading charges',
    },
    storagePerDay: {
      economy: 50,
      standard: 100,
      premium: 200,
      unit: '₹/day/ton',
      description: 'Temporary material storage',
    },
    cranageIfNeeded: {
      economy: 8000,
      standard: 15000,
      premium: 25000,
      unit: '₹/day',
      description: 'Crane rental for heavy lifting',
    },
  },

  // BUSINESS COSTS
  business: {
    serviceCharge: {
      economy: 8,
      standard: 12,
      premium: 18,
      unit: '% of material cost',
      description: 'Company service fee percentage',
    },
    profitMargin: {
      economy: 15,
      standard: 22,
      premium: 30,
      unit: '% of subtotal',
      description: 'Business profit margin',
    },
    gstTax: {
      economy: 18,
      standard: 18,
      premium: 18,
      unit: '% of subtotal',
      description: 'GST (Goods and Services Tax)',
    },
    warrantyExtended: {
      economy: 5,
      standard: 8,
      premium: 12,
      unit: '₹/sqm/year',
      description: 'Extended warranty beyond standard',
    },
    maintenanceAnnual: {
      economy: 12,
      standard: 18,
      premium: 28,
      unit: '₹/sqm/year',
      description: 'Annual maintenance contract',
    },
    insuranceOptional: {
      economy: 8,
      standard: 15,
      premium: 25,
      unit: '₹/sqm/year',
      description: 'Structure insurance premium',
    },
  },

  // MISCELLANEOUS
  miscellaneous: {
    wireAndCables: {
      economy: 18,
      standard: 28,
      premium: 45,
      unit: '₹/meter',
      description: 'Electrical wiring and cables',
    },
    paintingCoating: {
      economy: 25,
      standard: 40,
      premium: 65,
      unit: '₹/sqm',
      description: 'Anti-rust coating and painting',
    },
    signageBoard: {
      economy: 3000,
      standard: 6000,
      premium: 12000,
      unit: '₹/board',
      description: 'Company branding signage',
    },
    tools: {
      economy: 2000,
      standard: 4000,
      premium: 8000,
      unit: '₹/project',
      description: 'Tool rental and consumables',
    },
    safetyEquipment: {
      economy: 500,
      standard: 800,
      premium: 1200,
      unit: '₹/worker',
      description: 'Safety gear (helmet, gloves, etc)',
    },
    wastageContingency: {
      economy: 3,
      standard: 5,
      premium: 8,
      unit: '% of material cost',
      description: 'Material wastage and contingency',
    },
  },
};

/**
 * Get pricing for a specific tier
 */
export function getPricing(tier: PricingTier = 'standard'): Record<string, Record<string, number>> {
  const result: any = {};

  for (const [category, items] of Object.entries(DEFAULT_PRICING)) {
    result[category] = {};
    for (const [itemKey, itemValue] of Object.entries(items)) {
      result[category][itemKey] = (itemValue as MaterialPrice)[tier];
    }
  }

  return result;
}

/**
 * Calculate total material cost for a polyhouse
 */
export function calculateMaterialCost(
  areaSqm: number,
  tier: PricingTier = 'standard',
  options: {
    includeIrrigation?: boolean;
    includeClimateControl?: boolean;
    includeAutomation?: boolean;
    includeConcrete?: boolean;
  } = {}
): number {
  const pricing = getPricing(tier);
  let totalCost = 0;

  // Base structure (always included)
  totalCost += areaSqm * (
    (pricing.structure.giPipeMain * 0.15) + // Linear meters per sqm
    (pricing.structure.giPipeSecondary * 0.25) +
    (pricing.structure.giPipePurlins * 0.4) +
    pricing.structure.boltsAndClamps +
    pricing.structure.foundation
  );

  // Covering (always included)
  totalCost += areaSqm * pricing.covering.plasticFilm200micron;

  // Optional systems
  if (options.includeIrrigation) {
    totalCost += areaSqm * pricing.irrigation.dripLineBasic * 1.5; // 1.5m per sqm
    totalCost += pricing.irrigation.pumpSmall;
    totalCost += pricing.irrigation.filterSystem;
  }

  if (options.includeClimateControl) {
    totalCost += areaSqm * pricing.climateControl.naturalVentilation;
    totalCost += areaSqm * 0.1 * pricing.climateControl.fanSystem; // Fans for 10% of area
  }

  if (options.includeAutomation) {
    totalCost += pricing.automation.basicController;
    totalCost += pricing.automation.temperatureSensor * 2;
    totalCost += pricing.automation.humiditySensor;
  }

  if (options.includeConcrete) {
    totalCost += areaSqm * 0.15 * pricing.flooring.concreteFlooring; // Pathways ~15% of area
  }

  // Labor
  totalCost += areaSqm * pricing.labor.installationPerSqm;

  return totalCost;
}

// ===================================
// DSL Export Functions
// ===================================

/**
 * Default business settings for pricing DSL
 */
export const DEFAULT_BUSINESS_SETTINGS = {
  serviceChargePercent: 10,
  profitMarginPercent: 15,
  gstPercent: 18,
  transportCostPerKmTon: 50,
  installationLaborRate: 200,
};

/**
 * Export pricing configuration as DSL format
 * Compatible with PricingPreferences interface from shared/types.ts
 */
export function exportPricingAsDSL(
  tier: PricingTier = 'standard',
  customizations: Array<{ category: string; overrides: Record<string, number> }> = [],
  businessSettings: typeof DEFAULT_BUSINESS_SETTINGS = DEFAULT_BUSINESS_SETTINGS
) {
  return {
    tier,
    customizations,
    businessSettings,
  };
}

/**
 * Get default pricing preferences DSL
 */
export function getDefaultPricingPreferencesDSL() {
  return exportPricingAsDSL('standard', [], DEFAULT_BUSINESS_SETTINGS);
}

/**
 * Apply customizations to pricing configuration
 * Returns a modified pricing object with user overrides applied
 */
export function applyPricingCustomizations(
  basePricing: typeof DEFAULT_PRICING,
  customizations: Array<{ category: string; overrides: Record<string, number> }>
): typeof DEFAULT_PRICING {
  const modified = JSON.parse(JSON.stringify(basePricing)); // Deep clone

  for (const customization of customizations) {
    const { category, overrides } = customization;

    if (modified[category]) {
      for (const [itemKey, newPrice] of Object.entries(overrides)) {
        if (modified[category][itemKey]) {
          // Preserve the tier structure, update all tiers proportionally
          const currentStandard = modified[category][itemKey].standard;
          const ratio = newPrice / currentStandard;

          modified[category][itemKey].economy = Math.round(modified[category][itemKey].economy * ratio);
          modified[category][itemKey].standard = newPrice;
          modified[category][itemKey].premium = Math.round(modified[category][itemKey].premium * ratio);
        }
      }
    }
  }

  return modified;
}

/**
 * Serialize pricing preferences to JSON (for database storage)
 */
export function serializePricingPreferences(preferences: ReturnType<typeof exportPricingAsDSL>): string {
  return JSON.stringify(preferences);
}

/**
 * Deserialize pricing preferences from JSON
 */
export function deserializePricingPreferences(json: string): ReturnType<typeof exportPricingAsDSL> {
  try {
    const parsed = JSON.parse(json);
    return {
      tier: parsed.tier || 'standard',
      customizations: parsed.customizations || [],
      businessSettings: {
        ...DEFAULT_BUSINESS_SETTINGS,
        ...parsed.businessSettings,
      },
    };
  } catch (error) {
    console.error('Failed to deserialize pricing preferences:', error);
    return getDefaultPricingPreferencesDSL();
  }
}

/**
 * Get pricing configuration with user customizations applied
 */
export function getPricingWithCustomizations(
  tier: PricingTier,
  customizations: Array<{ category: string; overrides: Record<string, number> }>
): typeof DEFAULT_PRICING {
  if (customizations.length === 0) {
    return DEFAULT_PRICING;
  }

  return applyPricingCustomizations(DEFAULT_PRICING, customizations);
}
