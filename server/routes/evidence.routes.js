import express from 'express';
import { getGuidelines, getGuideline, searchEvidence } from '../controllers/evidence.controller.js';

const router = express.Router();

router.get('/guidelines', getGuidelines);
router.get('/guidelines/:id', getGuideline);
router.get('/search', searchEvidence);

export default router;
