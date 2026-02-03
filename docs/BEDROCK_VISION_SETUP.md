# Bedrock Vision Terrain Analysis Setup

## Overview

The Agriplast system now uses **AWS Bedrock Vision** (Claude with vision capabilities) to analyze satellite imagery for highly accurate terrain feature detection. This provides superior results compared to traditional map APIs.

## What It Detects

Using Bedrock Vision, the system can accurately identify:
- **Water Bodies**: Rivers, lakes, ponds, streams, wetlands
- **Forests**: Dense forests, tree clusters, protected vegetation
- **Roads**: Highways, paved roads, dirt roads, railway lines
- **Buildings**: Residential, commercial, industrial structures
- **Land Use**: Agricultural, barren, urban classification
- **Construction Suitability**: Risk assessment and recommendations

## How It Works

1. **Fetch Satellite Imagery**: Downloads high-resolution satellite image from Google Maps Static API
2. **AI Analysis**: Sends image to AWS Bedrock Claude Vision for analysis
3. **Structured Detection**: Receives detailed JSON with all detected features
4. **Integration**: Incorporates results into terrain analysis and displays in UI

## Setup Instructions

### 1. Enable Google Maps Static API

You need a Google Maps API key to fetch satellite imagery:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Maps Static API**:
   - Go to APIs & Services → Library
   - Search for "Maps Static API"
   - Click "Enable"
4. Create API Key:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "API Key"
   - Copy the API key

**Important**: Restrict your API key to prevent unauthorized use:
- Application restrictions: HTTP referrers or IP addresses
- API restrictions: Only "Maps Static API"

### 2. Add to Environment Variables

Add your Google Maps API key to `.env`:

```bash
# Backend .env file
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Make sure AWS Bedrock is configured
AWS_REGION=us-east-2
AWS_PROFILE=default
BEDROCK_MODEL_ID=global.anthropic.claude-sonnet-4-5-20251001-v1:0
```

### 3. Verify AWS Bedrock Access

Ensure you have access to Claude Sonnet 4.5 with vision:

```bash
# Test your AWS credentials
aws sts get-caller-identity --profile default

# Check Bedrock access
aws bedrock list-foundation-models --region us-east-2 --profile default | grep sonnet
```

### 4. Restart Backend Server

```bash
cd backend
npm run dev
```

You should see this log message:
```
✓ Bedrock Vision terrain analysis ENABLED (accurate detection)
```

If you see a warning, check your `GOOGLE_MAPS_API_KEY` is set correctly.

## Cost Considerations

### Google Maps Static API
- **Free Tier**: $200/month credit (≈28,000 map loads)
- **Cost**: $0.002 per map load after free tier
- **Our Usage**: 1 image per project analysis
- **Typical Cost**: Nearly free for most usage

### AWS Bedrock Vision
- **Model**: Claude Sonnet 4.5 (vision)
- **Input**: ~$3 per 1M input tokens
- **Output**: ~$15 per 1M output tokens
- **Image**: ~1,600 tokens per image
- **Per Analysis**: ~$0.01 - $0.02
- **Typical Cost**: Very low for occasional use

## Testing

### Test the Feature

1. **Create a New Project**:
   - Go to "New Project" in Agriplast
   - Draw a boundary near water/forests (e.g., near a lake or river)
   - Click "Continue with Optimization"

2. **Check Console Logs**:
   ```
   🛰️  Starting Bedrock-powered satellite imagery analysis...
     📷 Fetching satellite imagery from Google Maps...
     ✓ Satellite image fetched successfully
     🤖 Analyzing image with Claude Vision...
     ✓ Analysis complete!
       - Water bodies: 1 detected
       - Forests: 2 detected
       - Roads: 1 detected
       - Buildings: 0 detected
       - Suitability score: 75/100
   ```

3. **View Results**:
   - Check the "Optimization Factors" panel
   - Look for terrain analysis warnings
   - Review detected features and recommendations

### Example Locations to Test

Try these areas with distinct features:

1. **Water Bodies** (Karnataka):
   - Ulsoor Lake, Bangalore: 13.0°N, 77.6°E
   - Hesaraghatta Lake: 13.1°N, 77.5°E

2. **Forests** (Karnataka):
   - Bannerghatta National Park: 12.8°N, 77.6°E
   - Turahalli Forest: 12.9°N, 77.5°E

3. **Agricultural Land** (Karnataka):
   - Doddaballapura area: 13.3°N, 77.5°E

## Accuracy Comparison

### Before (OSM Only)
- ❌ Often misses small water bodies
- ❌ Incomplete road data in rural areas
- ❌ No forest detection in many regions
- ❌ Poor coverage outside major cities

### After (Bedrock Vision)
- ✅ Detects even small ponds and streams
- ✅ Identifies all roads from satellite imagery
- ✅ Accurate forest and vegetation detection
- ✅ Works reliably worldwide
- ✅ Provides construction suitability scores
- ✅ Gives specific recommendations

## Troubleshooting

### "Bedrock Vision disabled" warning

**Cause**: `GOOGLE_MAPS_API_KEY` not set

**Fix**:
```bash
# Add to backend/.env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### "Failed to fetch satellite imagery"

**Possible causes**:
1. Invalid API key
2. Maps Static API not enabled
3. API key restrictions too strict
4. Network/firewall issues

**Fix**:
1. Verify API key is correct
2. Check Maps Static API is enabled in Google Cloud Console
3. Temporarily remove API restrictions for testing
4. Check network connectivity

### "Vision analysis failed"

**Possible causes**:
1. AWS Bedrock credentials not configured
2. No access to Claude Sonnet 4.5
3. Region doesn't support vision models

**Fix**:
1. Check AWS credentials: `aws sts get-caller-identity`
2. Request access to Claude models in AWS Console
3. Try different region (us-east-1 or us-west-2)

### Analysis seems inaccurate

**Tips**:
- Ensure polygon covers area clearly visible in satellite view
- Avoid drawing boundaries over clouds or poor image quality areas
- For small plots (<1000m²), vision may be less accurate
- Compare with actual Google Maps satellite view

## Advanced Configuration

### Change Vision Model

To use a different Claude model, update `.env`:

```bash
# For better accuracy (higher cost)
VISION_MODEL_ID=anthropic.claude-opus-4-5-20251001-v1:0

# For faster analysis (lower cost)
VISION_MODEL_ID=anthropic.claude-haiku-4-5-20251001-v1:0
```

### Disable Vision Analysis

If you want to use only OSM data:

```bash
# Don't set GOOGLE_MAPS_API_KEY, or set it to empty
GOOGLE_MAPS_API_KEY=
```

The system will automatically fall back to OSM-only analysis.

## Support

For issues or questions:
1. Check backend console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with example locations listed above
4. Check AWS CloudWatch logs for Bedrock errors

## Next Steps

With Bedrock Vision enabled, you now have:
- ✅ Accurate terrain detection worldwide
- ✅ Better construction planning decisions
- ✅ Reduced risk of placing structures in restricted areas
- ✅ Professional-grade site analysis

Try creating projects in different locations to see the improved accuracy!
