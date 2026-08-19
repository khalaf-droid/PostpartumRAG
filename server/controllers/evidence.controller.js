import { evidenceService } from '../services/evidence.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// @desc    Get all clinical guideline metadata
// @route   GET /api/evidence/guidelines
// @access  Public / Private
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
// @access  Public / Private
export const getGuideline = asyncHandler(async (req, res, next) => {
  const guideline = await evidenceService.getGuidelineById(req.params.id);

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
// @access  Public / Private
export const searchEvidence = asyncHandler(async (req, res, next) => {
  const { q, publisher, limit } = req.query;

  const results = await evidenceService.searchEvidence(q, {
    publisher,
    limit: limit ? parseInt(limit, 10) : 5,
  });

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: {
      evidence: results,
    },
  });
});
