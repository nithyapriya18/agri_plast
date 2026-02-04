import { Material, MaterialType } from '@/lib/shared/types';

/**
 * Materials catalog for polyhouse construction
 * Prices in INR (Indian Rupees)
 */
export const materialsCatalog: Material[] = [
  // Pipes for structure
  {
    id: 'pipe-gi-25mm',
    type: MaterialType.PIPE,
    name: 'GI Pipe 25mm',
    description: 'Galvanized Iron pipe, 25mm diameter, standard quality',
    unitPrice: 85,
    unit: 'meter',
    specifications: {
      diameter: '25mm',
      material: 'Galvanized Iron',
      thickness: '2mm',
      length: '6m standard',
    },
  },
  {
    id: 'pipe-gi-32mm',
    type: MaterialType.PIPE,
    name: 'GI Pipe 32mm',
    description: 'Galvanized Iron pipe, 32mm diameter, heavy duty',
    unitPrice: 120,
    unit: 'meter',
    specifications: {
      diameter: '32mm',
      material: 'Galvanized Iron',
      thickness: '2.5mm',
      length: '6m standard',
    },
  },
  {
    id: 'pipe-ms-25mm',
    type: MaterialType.PIPE,
    name: 'MS Pipe 25mm',
    description: 'Mild Steel pipe, 25mm diameter, budget option',
    unitPrice: 65,
    unit: 'meter',
    specifications: {
      diameter: '25mm',
      material: 'Mild Steel',
      thickness: '2mm',
      length: '6m standard',
      note: 'Requires painting for rust protection',
    },
  },
  {
    id: 'pipe-pvc-32mm',
    type: MaterialType.PIPE,
    name: 'PVC Pipe 32mm',
    description: 'Heavy duty PVC pipe, 32mm diameter',
    unitPrice: 55,
    unit: 'meter',
    specifications: {
      diameter: '32mm',
      material: 'PVC',
      thickness: '3mm',
      length: '3m standard',
    },
  },

  // Gutters
  {
    id: 'gutter-gi-150mm',
    type: MaterialType.GUTTER,
    name: 'GI Gutter 150mm',
    description: 'Galvanized Iron gutter, 150mm width',
    unitPrice: 180,
    unit: 'meter',
    specifications: {
      width: '150mm',
      material: 'Galvanized Iron',
      gauge: '22',
    },
  },
  {
    id: 'gutter-pvc-150mm',
    type: MaterialType.GUTTER,
    name: 'PVC Gutter 150mm',
    description: 'PVC gutter, 150mm width, UV resistant',
    unitPrice: 95,
    unit: 'meter',
    specifications: {
      width: '150mm',
      material: 'PVC',
      uvResistant: true,
    },
  },

  // Covering materials
  {
    id: 'cover-uv-200mic',
    type: MaterialType.COVER,
    name: 'UV Plastic 200 Micron',
    description: 'UV stabilized polyethylene film, 200 micron thickness',
    unitPrice: 45,
    unit: 'sqm',
    specifications: {
      thickness: '200 micron',
      material: 'Polyethylene',
      uvProtection: '5 years',
      width: '4m',
    },
  },
  {
    id: 'cover-uv-250mic',
    type: MaterialType.COVER,
    name: 'UV Plastic 250 Micron',
    description: 'UV stabilized polyethylene film, 250 micron thickness, premium',
    unitPrice: 65,
    unit: 'sqm',
    specifications: {
      thickness: '250 micron',
      material: 'Polyethylene',
      uvProtection: '7 years',
      width: '4m',
    },
  },
  {
    id: 'cover-shadenet-50',
    type: MaterialType.COVER,
    name: 'Shade Net 50%',
    description: 'HDPE shade net, 50% shade factor',
    unitPrice: 35,
    unit: 'sqm',
    specifications: {
      shadeFactor: '50%',
      material: 'HDPE',
      uvProtection: '5 years',
    },
  },
  {
    id: 'cover-shadenet-75',
    type: MaterialType.COVER,
    name: 'Shade Net 75%',
    description: 'HDPE shade net, 75% shade factor',
    unitPrice: 42,
    unit: 'sqm',
    specifications: {
      shadeFactor: '75%',
      material: 'HDPE',
      uvProtection: '5 years',
    },
  },
  {
    id: 'cover-insect-net',
    type: MaterialType.COVER,
    name: 'Insect Proof Net',
    description: 'Fine mesh insect proof net, 40 mesh',
    unitPrice: 55,
    unit: 'sqm',
    specifications: {
      meshSize: '40 mesh',
      material: 'HDPE',
      uvProtection: '5 years',
    },
  },

  // Connectors and fittings
  {
    id: 'connector-elbow-25mm',
    type: MaterialType.CONNECTOR,
    name: 'Elbow Connector 25mm',
    description: '90-degree elbow connector for 25mm pipes',
    unitPrice: 25,
    unit: 'piece',
    specifications: {
      angle: '90 degrees',
      pipeDiameter: '25mm',
      material: 'GI',
    },
  },
  {
    id: 'connector-tee-25mm',
    type: MaterialType.CONNECTOR,
    name: 'T-Connector 25mm',
    description: 'T-junction connector for 25mm pipes',
    unitPrice: 28,
    unit: 'piece',
    specifications: {
      type: 'T-junction',
      pipeDiameter: '25mm',
      material: 'GI',
    },
  },
  {
    id: 'connector-cross-25mm',
    type: MaterialType.CONNECTOR,
    name: 'Cross Connector 25mm',
    description: 'Cross junction connector for 25mm pipes',
    unitPrice: 35,
    unit: 'piece',
    specifications: {
      type: 'Cross junction',
      pipeDiameter: '25mm',
      material: 'GI',
    },
  },

  // Foundation
  {
    id: 'foundation-concrete-mix',
    type: MaterialType.FOUNDATION,
    name: 'Concrete Mix M20',
    description: 'Ready mix concrete M20 grade for foundation',
    unitPrice: 5500,
    unit: 'cubic meter',
    specifications: {
      grade: 'M20',
      ratio: '1:1.5:3',
    },
  },
  {
    id: 'foundation-anchor-bolt',
    type: MaterialType.FOUNDATION,
    name: 'Anchor Bolt Set',
    description: 'Foundation anchor bolt with nut and washer',
    unitPrice: 85,
    unit: 'piece',
    specifications: {
      size: 'M16 x 300mm',
      material: 'Steel',
    },
  },
];

export function getMaterialById(id: string): Material | undefined {
  return materialsCatalog.find(m => m.id === id);
}

export function getMaterialsByType(type: MaterialType): Material[] {
  return materialsCatalog.filter(m => m.type === type);
}

export function getDefaultMaterialSelections(): { [key in MaterialType]: string } {
  return {
    [MaterialType.PIPE]: 'pipe-gi-25mm',
    [MaterialType.GUTTER]: 'gutter-gi-150mm',
    [MaterialType.COVER]: 'cover-uv-200mic',
    [MaterialType.CONNECTOR]: 'connector-elbow-25mm',
    [MaterialType.FOUNDATION]: 'foundation-concrete-mix',
  };
}
