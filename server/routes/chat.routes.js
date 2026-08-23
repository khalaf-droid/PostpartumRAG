import express from 'express';
import { getSessions, getSession, sendQuery, deleteSession } from '../controllers/chat.controller.js';
import { protect } from '../middleware/auth.js';
import { queryLimiter } from '../middleware/rateLimiter.js';
import { validate, chatQuerySchema, objectIdParamSchema } from '../middleware/validate.js';

const router = express.Router();

// All chat routes require authentication
router.use(protect);

router.get('/sessions', getSessions);
router.post('/query', queryLimiter, validate(chatQuerySchema), sendQuery);

router
  .route('/sessions/:id')
  .get(validate(objectIdParamSchema, 'params'), getSession)
  .delete(validate(objectIdParamSchema, 'params'), deleteSession);

export default router;
