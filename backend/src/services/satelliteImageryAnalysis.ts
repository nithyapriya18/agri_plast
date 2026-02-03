/**
 * Satellite Imagery Analysis using AWS Bedrock Vision
 * Uses Claude Vision to analyze satellite imagery for accurate terrain feature detection
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { Coordinate } from '@shared/types';
import * as turf from '@turf/turf';
import axios from 'axios';

export interface DetectedFeature {
  type: 'water' | 'forest' | 'road' | 'building' | 'agricultural' | 'barren';
  location: {
    description: string; // e.g., "center-left", "top-right quadrant"
    estimatedPercentage: number; // 0-100
    coordinates?: Coordinate[]; // If we can estimate polygon
  };
  confidence: 'high' | 'medium' | 'low';
  details: string; // Additional description
}

export interface SatelliteAnalysisResult {
  waterBodies: DetectedFeature[];
  forests: DetectedFeature[];
  roads: DetectedFeature[];
  buildings: DetectedFeature[];
  landUseDescription: string;
  suitabilityForConstruction: {
    score: number; // 0-100
    concerns: string[];
    recommendations: string[];
  };
  imageUrl: string;
}

export class SatelliteImageryAnalysisService {
  private client: BedrockRuntimeClient;
  private visionModelId: string;

  constructor() {
    const clientConfig: any = {
      region: process.env.AWS_REGION || 'us-east-1',
    };

    // Support AWS SSO profiles via AWS_PROFILE environment variable
    // If AWS_PROFILE is set, AWS SDK will automatically use SSO credentials
    // Otherwise, fall back to explicit credentials or default credential chain
    if (process.env.AWS_PROFILE) {
      console.log(`🔐 Using AWS SSO profile: ${process.env.AWS_PROFILE}`);
      // AWS SDK will automatically pick up SSO credentials from ~/.aws/config
    } else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
      console.log(`🔐 Using explicit AWS credentials`);
    } else {
      console.log(`🔐 Using default AWS credential chain`);
    }

    this.client = new BedrockRuntimeClient(clientConfig);
    // Use Claude Haiku 4.5 for vision capabilities (cheaper, still accurate)
    // Cost: ~$0.004 per analysis vs ~$0.02 for Sonnet
    // For maximum accuracy, use: anthropic.claude-sonnet-4-5-20251001-v1:0
    this.visionModelId = process.env.VISION_MODEL_ID || 'anthropic.claude-haiku-4-5-20251001-v1:0';

    console.log(`🛰️  Satellite Imagery Analysis initialized with Bedrock Vision`);
    console.log(`   Model: ${this.visionModelId}`);
    console.log(`   Region: ${clientConfig.region}`);
  }

  /**
   * Analyze satellite imagery for a land area using Claude Vision
   */
  async analyzeSatelliteImagery(
    coordinates: Coordinate[]
  ): Promise<SatelliteAnalysisResult> {
    console.log('🛰️  Starting Bedrock-powered satellite imagery analysis...');

    // Step 1: Get the center point and calculate bounds
    const center = this.calculateCenterPoint(coordinates);
    const bounds = this.calculateBounds(coordinates);

    // Step 2: Fetch satellite imagery from Google Maps Static API
    const imageUrl = this.buildGoogleMapsStaticUrl(center, bounds, coordinates);
    console.log('  📷 Fetching satellite imagery from Google Maps...');

    // Download the image
    let imageBase64: string;
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      imageBase64 = Buffer.from(response.data, 'binary').toString('base64');
      console.log('  ✓ Satellite image fetched successfully');
    } catch (error) {
      console.error('  ✗ Failed to fetch satellite image:', error);
      throw new Error('Failed to fetch satellite imagery from Google Maps');
    }

    // Step 3: Analyze the image using Bedrock Claude Vision
    console.log('  🤖 Analyzing image with Claude Vision...');
    const analysis = await this.analyzeImageWithVision(imageBase64, coordinates);

    console.log('  ✓ Analysis complete!');
    return {
      ...analysis,
      imageUrl,
    };
  }

  /**
   * Analyze the satellite image using Claude Vision via Bedrock
   */
  private async analyzeImageWithVision(
    imageBase64: string,
    coordinates: Coordinate[]
  ): Promise<Omit<SatelliteAnalysisResult, 'imageUrl'>> {
    const prompt = `You are an expert land surveyor and terrain analyst. Analyze this satellite image of a land plot and provide detailed information about the terrain features.

The land boundary has been marked on the image (if visible). Please analyze ONLY the area within or near this boundary.

Identify and describe:
1. **Water Bodies**: Rivers, lakes, ponds, streams, wetlands, or any water features. For each, specify:
   - Location within the image (e.g., "northwest corner", "center-left")
   - Estimated percentage of the land area covered
   - Type (river, pond, lake, stream, seasonal water, etc.)
   - Your confidence level (high/medium/low)

2. **Forests & Vegetation**: Dense forests, tree clusters, protected vegetation. For each:
   - Location description
   - Estimated coverage percentage
   - Type (dense forest, scattered trees, plantation, protected forest)
   - Confidence level

3. **Roads & Infrastructure**: Paved roads, dirt roads, highways, railway lines. For each:
   - Location description
   - Type (major road, minor road, dirt path, railway)
   - Width estimate (wide/medium/narrow)
   - Confidence level

4. **Buildings & Structures**: Existing buildings, houses, industrial structures. For each:
   - Location description
   - Type (residential, commercial, industrial, agricultural shed)
   - Size estimate
   - Confidence level

5. **Land Use**: Overall land use classification (agricultural, barren, urban, mixed)

6. **Construction Suitability**:
   - Score from 0-100 (0 = unsuitable, 100 = perfect)
   - List any concerns (flooding risk, protected areas, slopes, etc.)
   - Recommendations for construction

Please respond in this EXACT JSON format:
{
  "waterBodies": [
    {
      "type": "water",
      "location": {
        "description": "location description",
        "estimatedPercentage": 0-100
      },
      "confidence": "high|medium|low",
      "details": "detailed description"
    }
  ],
  "forests": [
    {
      "type": "forest",
      "location": {
        "description": "location description",
        "estimatedPercentage": 0-100
      },
      "confidence": "high|medium|low",
      "details": "detailed description"
    }
  ],
  "roads": [
    {
      "type": "road",
      "location": {
        "description": "location description",
        "estimatedPercentage": 0-100
      },
      "confidence": "high|medium|low",
      "details": "detailed description"
    }
  ],
  "buildings": [
    {
      "type": "building",
      "location": {
        "description": "location description",
        "estimatedPercentage": 0-100
      },
      "confidence": "high|medium|low",
      "details": "detailed description"
    }
  ],
  "landUseDescription": "overall land use summary",
  "suitabilityForConstruction": {
    "score": 0-100,
    "concerns": ["concern 1", "concern 2"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  }
}

Be thorough and precise. If you see features, describe them accurately. If you don't see certain features, use empty arrays.`;

    try {
      const command = new InvokeModelCommand({
        modelId: this.visionModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract the response text
      const responseText = responseBody.content[0].text;

      // Parse JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from Claude response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        waterBodies: analysis.waterBodies || [],
        forests: analysis.forests || [],
        roads: analysis.roads || [],
        buildings: analysis.buildings || [],
        landUseDescription: analysis.landUseDescription || 'Unknown',
        suitabilityForConstruction: analysis.suitabilityForConstruction || {
          score: 50,
          concerns: [],
          recommendations: [],
        },
      };
    } catch (error) {
      console.error('Error analyzing image with Bedrock Vision:', error);
      throw new Error(`Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build Google Maps Static API URL for satellite imagery
   */
  private buildGoogleMapsStaticUrl(
    center: Coordinate,
    bounds: { min: Coordinate; max: Coordinate },
    coordinates: Coordinate[]
  ): string {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    // Calculate appropriate zoom level based on bounds
    const zoom = this.calculateZoomLevel(bounds);

    // Build the URL with satellite imagery
    // Draw the boundary polygon on the image
    const pathString = coordinates.map(c => `${c.lat},${c.lng}`).join('|');

    const url = `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${center.lat},${center.lng}` +
      `&zoom=${zoom}` +
      `&size=640x640` +
      `&scale=2` + // High resolution
      `&maptype=satellite` +
      `&path=color:0xff0000ff|weight:3|${pathString}` + // Draw boundary in red
      `&key=${apiKey}`;

    return url;
  }

  /**
   * Calculate center point of polygon
   */
  private calculateCenterPoint(coordinates: Coordinate[]): Coordinate {
    const lats = coordinates.map(c => c.lat);
    const lngs = coordinates.map(c => c.lng);

    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    };
  }

  /**
   * Calculate bounds of the polygon
   */
  private calculateBounds(coordinates: Coordinate[]): { min: Coordinate; max: Coordinate } {
    const lats = coordinates.map(c => c.lat);
    const lngs = coordinates.map(c => c.lng);

    return {
      min: { lat: Math.min(...lats), lng: Math.min(...lngs) },
      max: { lat: Math.max(...lats), lng: Math.max(...lngs) },
    };
  }

  /**
   * Calculate appropriate zoom level based on bounds
   */
  private calculateZoomLevel(bounds: { min: Coordinate; max: Coordinate }): number {
    const latDiff = bounds.max.lat - bounds.min.lat;
    const lngDiff = bounds.max.lng - bounds.min.lng;
    const maxDiff = Math.max(latDiff, lngDiff);

    // Approximate zoom levels
    if (maxDiff > 0.1) return 13;
    if (maxDiff > 0.05) return 14;
    if (maxDiff > 0.02) return 15;
    if (maxDiff > 0.01) return 16;
    if (maxDiff > 0.005) return 17;
    return 18;
  }
}
