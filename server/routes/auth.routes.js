import express from 'express';
import { register, login, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, registerLimiter } from '../middleware/rateLimiter.js';
import { validate, registerSchema, loginSchema } from '../middleware/validate.js';
import User from '../models/User.js';

const router = express.Router();

// ── Public routes (rate limited + validated) ────────────────
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// ── Protected routes ────────────────────────────────────────
router.get('/me', protect, getMe);

// ── Test Environment Routes ─────────────────────────────────
if (process.env.NODE_ENV === 'test') {
  router.delete('/test-cleanup', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });
      await User.deleteOne({ email });
      res.status(200).json({ message: 'Test user cleaned up' });
    } catch (err) {
      res.status(500).json({ error: 'Cleanup failed' });
    }
  });
}

export default router;
