import express from 'express';
import { getGuidelines, getGuideline, searchEvidence } from '../controllers/evidence.controller.js';
import { validate, evidenceSearchSchema } from '../middleware/validate.js';

const router = express.Router();

// Evidence routes are intentionally public (clinical reference data)
// but search inputs are still validated to prevent injection
router.get('/guidelines', getGuidelines);
router.get('/guidelines/:id', getGuideline);
router.get('/search', validate(evidenceSearchSchema, 'query'), searchEvidence);

export default router;
