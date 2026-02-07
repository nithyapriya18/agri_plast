/**
 * Learning Profile API Routes
 */

import { Router } from 'express';
import { Request, Response } from 'express';
import { learningService } from '../services/learningService';

const router = Router();

/**
 * GET /api/learning/profile
 * Get user's learning profile
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const profile = await learningService.getLearningProfile(userId);

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Error getting learning profile:', error);
    res.status(500).json({
      error: 'Failed to get learning profile',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/learning/record
 * Record a user preference
 */
router.post('/record', async (req: Request, res: Response) => {
  try {
    const { userId, pattern, context } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!pattern) {
      return res.status(400).json({ error: 'Pattern is required' });
    }

    await learningService.recordPreference(userId, pattern, context);

    res.json({
      success: true,
      message: 'Preference recorded',
    });
  } catch (error) {
    console.error('Error recording preference:', error);
    res.status(500).json({
      error: 'Failed to record preference',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/learning/extract
 * Extract patterns from conversation history
 */
router.post('/extract', async (req: Request, res: Response) => {
  try {
    const { userId, conversationHistory } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({ error: 'Conversation history is required' });
    }

    const patterns = await learningService.extractPatternsFromConversation(
      userId,
      conversationHistory
    );

    res.json({
      success: true,
      patterns,
    });
  } catch (error) {
    console.error('Error extracting patterns:', error);
    res.status(500).json({
      error: 'Failed to extract patterns',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/learning/summary
 * Get AI-friendly summary of learning profile
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const summary = await learningService.getLearningProfileSummary(userId);

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error getting learning summary:', error);
    res.status(500).json({
      error: 'Failed to get learning summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/learning/apply
 * Apply learned preferences to a new project
 */
router.put('/apply', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const preferences = await learningService.applyLearnedPreferences(userId);

    res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error applying learned preferences:', error);
    res.status(500).json({
      error: 'Failed to apply learned preferences',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
