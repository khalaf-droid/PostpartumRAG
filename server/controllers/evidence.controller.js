import { evidenceService } from '../services/evidence.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Evidence Controller — Security Hardened
 *
 * Security features:
 * - Search query validated via Zod middleware in routes
 * - ID parameter sanitized to prevent injection
 * - Result limits enforced
 */

// @desc    Get all clinical guideline metadata
// @route   GET /api/evidence/guidelines
// @access  Public (intentional — reference data)
export const getGuidelines = asyncHandler(async (req, res, next) => {
  const guidelines = await evidenceService.getGuidelines();

  res.status(200).json({
    status: 'success',
    results: guidelines.length,
    data: {
      guidelines,
    },
  });
});

// @desc    Get single guideline document by ID
// @route   GET /api/evidence/guidelines/:id
// @access  Public (intentional — reference data)
export const getGuideline = asyncHandler(async (req, res, next) => {
  // Sanitize ID parameter — only allow alphanumeric and hyphens
  const id = req.params.id.replace(/[^a-zA-Z0-9-]/g, '');

  const guideline = await evidenceService.getGuidelineById(id);

  if (!guideline) {
    return next(new ApiError(404, 'No guideline document found with that ID'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      guideline,
    },
  });
});

// @desc    Search evidence snippets
// @route   GET /api/evidence/search
// @access  Public (intentional — reference data)
export const searchEvidence = asyncHandler(async (req, res, next) => {
  // Query params are validated by Zod middleware in routes
  const { q, publisher, limit } = req.query;

  const results = await evidenceService.searchEvidence(q, {
    publisher,
    limit: typeof limit === 'number' ? limit : (limit ? parseInt(limit, 10) : 5),
  });

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: {
      evidence: results,
    },
  });
});
