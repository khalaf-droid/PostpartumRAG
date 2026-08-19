import express from 'express';
import { getSessions, getSession, sendQuery, deleteSession } from '../controllers/chat.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All chat routes require authentication
router.use(protect);

router.get('/sessions', getSessions);
router.post('/query', sendQuery);

router
  .route('/sessions/:id')
  .get(getSession)
  .delete(deleteSession);

export default router;
