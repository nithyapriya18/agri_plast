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
  structure: {
    giPipeMain: MaterialPrice;
    giPipeSecondary: MaterialPrice;
    giPipePurlins: MaterialPrice;
    boltsAndClamps: MaterialPrice;
    foundation: MaterialPrice;
    anchorsAndBases: MaterialPrice;
  };
  covering: {
    plasticFilm200micron: MaterialPrice;
    plasticFilm150micron: MaterialPrice;
    uvStabilizedSheet: MaterialPrice;
    shadeNet50: MaterialPrice;
    shadeNet75: MaterialPrice;
    insectNet40mesh: MaterialPrice;
    antiDripFilm: MaterialPrice;
  };
  climateControl: {
    naturalVentilation: MaterialPrice;
    fanSystem: MaterialPrice;
    coolingPads: MaterialPrice;
    foggerSystem: MaterialPrice;
    heatingSystem: MaterialPrice;
    thermostat: MaterialPrice;
    humidityController: MaterialPrice;
  };
  irrigation: {
    dripLineBasic: MaterialPrice;
    dripLineInline: MaterialPrice;
    sprinklerSystem: MaterialPrice;
    mainPipePVC: MaterialPrice;
    lateralPipes: MaterialPrice;
    filterSystem: MaterialPrice;
    pumpSmall: MaterialPrice;
    pumpMedium: MaterialPrice;
    pumpLarge: MaterialPrice;
    fertilizerInjector: MaterialPrice;
    valvesAndFittings: MaterialPrice;
  };
  flooring: {
    mulchFilm: MaterialPrice;
    weedMatFabric: MaterialPrice;
    concreteFlooring: MaterialPrice;
    gravelFlooring: MaterialPrice;
    growingBenches: MaterialPrice;
    trellisSupport: MaterialPrice;
  };
  access: {
    doorSingle: MaterialPrice;
    doorDouble: MaterialPrice;
    rollupDoor: MaterialPrice;
    windowVents: MaterialPrice;
    insectScreenDoor: MaterialPrice;
  };
  automation: {
    basicController: MaterialPrice;
    smartController: MaterialPrice;
    soilMoistureSensor: MaterialPrice;
    temperatureSensor: MaterialPrice;
    humiditySensor: MaterialPrice;
    lightSensor: MaterialPrice;
    motorizedVentilation: MaterialPrice;
    weatherStation: MaterialPrice;
  };
  labor: {
    designFee: MaterialPrice;
    engineeringFee: MaterialPrice;
    installationPerSqm: MaterialPrice;
    electricalWork: MaterialPrice;
    plumbingWork: MaterialPrice;
    supervisorPerDay: MaterialPrice;
    workerPerDay: MaterialPrice;
    skilledWorkerPerDay: MaterialPrice;
  };
  logistics: {
    transportationPerKm: MaterialPrice;
    loadingUnloading: MaterialPrice;
    storagePerDay: MaterialPrice;
    cranageIfNeeded: MaterialPrice;
  };
  business: {
    serviceCharge: MaterialPrice;
    profitMargin: MaterialPrice;
    gstTax: MaterialPrice;
    warrantyExtended: MaterialPrice;
    maintenanceAnnual: MaterialPrice;
    insuranceOptional: MaterialPrice;
  };
  miscellaneous: {
    wireAndCables: MaterialPrice;
    paintingCoating: MaterialPrice;
    signageBoard: MaterialPrice;
    tools: MaterialPrice;
    safetyEquipment: MaterialPrice;
    wastageContingency: MaterialPrice;
  };
}

export const DEFAULT_PRICING: PricingConfiguration = {
  structure: {
    giPipeMain: { economy: 280, standard: 350, premium: 450, unit: '₹/meter', description: 'Main frame GI pipes - 80mm diameter, galvanized' },
    giPipeSecondary: { economy: 180, standard: 220, premium: 280, unit: '₹/meter', description: 'Secondary frame GI pipes - 50mm diameter' },
    giPipePurlins: { economy: 90, standard: 120, premium: 160, unit: '₹/meter', description: 'Purlins and cross members - 25mm diameter' },
    boltsAndClamps: { economy: 25, standard: 35, premium: 50, unit: '₹/sqm', description: 'Fasteners, bolts, clamps per sqm of structure' },
    foundation: { economy: 120, standard: 180, premium: 280, unit: '₹/sqm', description: 'Concrete foundation with anchors' },
    anchorsAndBases: { economy: 150, standard: 250, premium: 400, unit: '₹/piece', description: 'Ground anchors and base plates' },
  },
  covering: {
    plasticFilm200micron: { economy: 40, standard: 55, premium: 75, unit: '₹/sqm', description: 'Standard 200 micron UV-treated plastic film' },
    plasticFilm150micron: { economy: 28, standard: 38, premium: 50, unit: '₹/sqm', description: 'Economy 150 micron plastic film' },
    uvStabilizedSheet: { economy: 65, standard: 90, premium: 130, unit: '₹/sqm', description: 'Premium UV-stabilized polycarbonate sheets' },
    shadeNet50: { economy: 18, standard: 28, premium: 40, unit: '₹/sqm', description: '50% shade net - HDPE material' },
    shadeNet75: { economy: 22, standard: 32, premium: 48, unit: '₹/sqm', description: '75% shade net - UV stabilized' },
    insectNet40mesh: { economy: 35, standard: 50, premium: 70, unit: '₹/sqm', description: '40 mesh insect protection net' },
    antiDripFilm: { economy: 55, standard: 75, premium: 100, unit: '₹/sqm', description: 'Anti-condensation drip film' },
  },
  climateControl: {
    naturalVentilation: { economy: 15, standard: 25, premium: 40, unit: '₹/sqm', description: 'Natural ventilation openings with screens' },
    fanSystem: { economy: 45, standard: 65, premium: 95, unit: '₹/sqm', description: 'Exhaust fan system with controls' },
    coolingPads: { economy: 80, standard: 120, premium: 180, unit: '₹/sqm', description: 'Evaporative cooling pad system' },
    foggerSystem: { economy: 60, standard: 90, premium: 140, unit: '₹/sqm', description: 'High-pressure fogging system' },
    heatingSystem: { economy: 100, standard: 150, premium: 250, unit: '₹/sqm', description: 'Heating system for cold climates' },
    thermostat: { economy: 2500, standard: 5000, premium: 12000, unit: '₹/unit', description: 'Temperature control system' },
    humidityController: { economy: 3000, standard: 6000, premium: 15000, unit: '₹/unit', description: 'Humidity sensor and controller' },
  },
  irrigation: {
    dripLineBasic: { economy: 8, standard: 12, premium: 18, unit: '₹/meter', description: 'Basic inline drip tape' },
    dripLineInline: { economy: 15, standard: 22, premium: 32, unit: '₹/meter', description: 'Pressure-compensated inline drippers' },
    sprinklerSystem: { economy: 35, standard: 55, premium: 85, unit: '₹/sqm', description: 'Overhead sprinkler irrigation' },
    mainPipePVC: { economy: 45, standard: 65, premium: 95, unit: '₹/meter', description: 'Main PVC supply pipes (63mm)' },
    lateralPipes: { economy: 18, standard: 28, premium: 40, unit: '₹/meter', description: 'Lateral distribution LDPE pipes' },
    filterSystem: { economy: 8000, standard: 15000, premium: 30000, unit: '₹/unit', description: 'Sand filter or screen filter system' },
    pumpSmall: { economy: 6000, standard: 9000, premium: 15000, unit: '₹/unit', description: '0.5 HP water pump' },
    pumpMedium: { economy: 10000, standard: 15000, premium: 25000, unit: '₹/unit', description: '1 HP water pump' },
    pumpLarge: { economy: 18000, standard: 28000, premium: 45000, unit: '₹/unit', description: '2 HP water pump' },
    fertilizerInjector: { economy: 12000, standard: 25000, premium: 50000, unit: '₹/unit', description: 'Venturi or dosing pump fertilizer injector' },
    valvesAndFittings: { economy: 20, standard: 35, premium: 55, unit: '₹/unit', description: 'Valves, connectors, elbows, tees' },
  },
  flooring: {
    mulchFilm: { economy: 12, standard: 18, premium: 28, unit: '₹/sqm', description: 'Ground mulch plastic film' },
    weedMatFabric: { economy: 25, standard: 40, premium: 60, unit: '₹/sqm', description: 'Weed control geotextile fabric' },
    concreteFlooring: { economy: 180, standard: 280, premium: 450, unit: '₹/sqm', description: 'Concrete pathways and flooring' },
    gravelFlooring: { economy: 45, standard: 65, premium: 95, unit: '₹/sqm', description: 'Gravel or stone flooring' },
    growingBenches: { economy: 350, standard: 550, premium: 850, unit: '₹/sqm', description: 'Raised growing benches/tables' },
    trellisSupport: { economy: 35, standard: 55, premium: 85, unit: '₹/sqm', description: 'Vertical crop support system' },
  },
  access: {
    doorSingle: { economy: 4500, standard: 7500, premium: 12000, unit: '₹/unit', description: 'Single door 3ft x 7ft with frame' },
    doorDouble: { economy: 8000, standard: 13000, premium: 20000, unit: '₹/unit', description: 'Double door 6ft x 7ft with frame' },
    rollupDoor: { economy: 450, standard: 700, premium: 1100, unit: '₹/sqm', description: 'Roll-up side curtain door' },
    windowVents: { economy: 2500, standard: 4000, premium: 6500, unit: '₹/unit', description: 'Side or roof ventilation windows' },
    insectScreenDoor: { economy: 5500, standard: 8500, premium: 13000, unit: '₹/unit', description: 'Insect mesh entry door' },
  },
  automation: {
    basicController: { economy: 8000, standard: 15000, premium: 28000, unit: '₹/unit', description: 'Basic timer and relay controller' },
    smartController: { economy: 25000, standard: 50000, premium: 100000, unit: '₹/unit', description: 'IoT-enabled smart climate controller' },
    soilMoistureSensor: { economy: 800, standard: 1500, premium: 3000, unit: '₹/unit', description: 'Soil moisture sensor probe' },
    temperatureSensor: { economy: 600, standard: 1200, premium: 2500, unit: '₹/unit', description: 'Digital temperature sensor' },
    humiditySensor: { economy: 1000, standard: 2000, premium: 4000, unit: '₹/unit', description: 'Humidity sensor (RH%)' },
    lightSensor: { economy: 1500, standard: 3000, premium: 6000, unit: '₹/unit', description: 'PAR/Light intensity sensor' },
    motorizedVentilation: { economy: 15000, standard: 28000, premium: 50000, unit: '₹/unit', description: 'Automated vent opener system' },
    weatherStation: { economy: 35000, standard: 70000, premium: 150000, unit: '₹/unit', description: 'Complete weather monitoring station' },
  },
  labor: {
    designFee: { economy: 5000, standard: 12000, premium: 25000, unit: '₹/project', description: 'Design and layout planning fee' },
    engineeringFee: { economy: 8000, standard: 18000, premium: 35000, unit: '₹/project', description: 'Structural engineering certification' },
    installationPerSqm: { economy: 45, standard: 75, premium: 120, unit: '₹/sqm', description: 'Installation labor cost per sqm' },
    electricalWork: { economy: 25, standard: 40, premium: 65, unit: '₹/sqm', description: 'Electrical wiring and setup' },
    plumbingWork: { economy: 30, standard: 50, premium: 80, unit: '₹/sqm', description: 'Irrigation plumbing installation' },
    supervisorPerDay: { economy: 1200, standard: 1800, premium: 2500, unit: '₹/day', description: 'Site supervisor daily rate' },
    workerPerDay: { economy: 500, standard: 700, premium: 900, unit: '₹/day', description: 'General laborer daily wage' },
    skilledWorkerPerDay: { economy: 800, standard: 1200, premium: 1600, unit: '₹/day', description: 'Skilled technician daily rate' },
  },
  logistics: {
    transportationPerKm: { economy: 12, standard: 18, premium: 28, unit: '₹/km/ton', description: 'Material transportation cost' },
    loadingUnloading: { economy: 800, standard: 1500, premium: 2500, unit: '₹/ton', description: 'Loading and unloading charges' },
    storagePerDay: { economy: 50, standard: 100, premium: 200, unit: '₹/day/ton', description: 'Temporary material storage' },
    cranageIfNeeded: { economy: 8000, standard: 15000, premium: 25000, unit: '₹/day', description: 'Crane rental for heavy lifting' },
  },
  business: {
    serviceCharge: { economy: 8, standard: 12, premium: 18, unit: '% of material cost', description: 'Company service fee percentage' },
    profitMargin: { economy: 15, standard: 22, premium: 30, unit: '% of subtotal', description: 'Business profit margin' },
    gstTax: { economy: 18, standard: 18, premium: 18, unit: '% of subtotal', description: 'GST (Goods and Services Tax)' },
    warrantyExtended: { economy: 5, standard: 8, premium: 12, unit: '₹/sqm/year', description: 'Extended warranty beyond standard' },
    maintenanceAnnual: { economy: 12, standard: 18, premium: 28, unit: '₹/sqm/year', description: 'Annual maintenance contract' },
    insuranceOptional: { economy: 8, standard: 15, premium: 25, unit: '₹/sqm/year', description: 'Structure insurance premium' },
  },
  miscellaneous: {
    wireAndCables: { economy: 18, standard: 28, premium: 45, unit: '₹/meter', description: 'Electrical wiring and cables' },
    paintingCoating: { economy: 25, standard: 40, premium: 65, unit: '₹/sqm', description: 'Anti-rust coating and painting' },
    signageBoard: { economy: 3000, standard: 6000, premium: 12000, unit: '₹/board', description: 'Company branding signage' },
    tools: { economy: 2000, standard: 4000, premium: 8000, unit: '₹/project', description: 'Tool rental and consumables' },
    safetyEquipment: { economy: 500, standard: 800, premium: 1200, unit: '₹/worker', description: 'Safety gear (helmet, gloves, etc)' },
    wastageContingency: { economy: 3, standard: 5, premium: 8, unit: '% of material cost', description: 'Material wastage and contingency' },
  },
};

export function getPricing(tier: PricingTier = 'standard'): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const [category, items] of Object.entries(DEFAULT_PRICING)) {
    result[category] = {};
    for (const [itemKey, itemValue] of Object.entries(items)) {
      result[category][itemKey] = (itemValue as MaterialPrice)[tier];
    }
  }
  return result;
}

export function calculateMaterialCost(
  areaSqm: number,
  tier: PricingTier = 'standard',
  options: { includeIrrigation?: boolean; includeClimateControl?: boolean; includeAutomation?: boolean; includeConcrete?: boolean } = {}
): number {
  const pricing = getPricing(tier);
  let totalCost = 0;
  totalCost += areaSqm * (
    (pricing.structure.giPipeMain * 0.15) + (pricing.structure.giPipeSecondary * 0.25) +
    (pricing.structure.giPipePurlins * 0.4) + pricing.structure.boltsAndClamps + pricing.structure.foundation
  );
  totalCost += areaSqm * pricing.covering.plasticFilm200micron;
  if (options.includeIrrigation) {
    totalCost += areaSqm * pricing.irrigation.dripLineBasic * 1.5;
    totalCost += pricing.irrigation.pumpSmall + pricing.irrigation.filterSystem;
  }
  if (options.includeClimateControl) {
    totalCost += areaSqm * pricing.climateControl.naturalVentilation;
    totalCost += areaSqm * 0.1 * pricing.climateControl.fanSystem;
  }
  if (options.includeAutomation) {
    totalCost += pricing.automation.basicController + pricing.automation.temperatureSensor * 2 + pricing.automation.humiditySensor;
  }
  if (options.includeConcrete) totalCost += areaSqm * 0.15 * pricing.flooring.concreteFlooring;
  totalCost += areaSqm * pricing.labor.installationPerSqm;
  return totalCost;
}
