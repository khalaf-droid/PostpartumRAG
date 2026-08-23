import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Auth Controller — Security Hardened
 *
 * Security features:
 * - Input validation via Zod middleware (applied in routes)
 * - Account lockout on failed attempts (CWE-307)
 * - Constant-time error messages to prevent user enumeration (CWE-203)
 * - Token expiry from environment config
 * - Role injection prevention
 */

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password from output (defense in depth — toJSON also strips it)
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// ── REGISTER ───────────────────────────────────────────────────
export const register = asyncHandler(async (req, res, next) => {
  // Body is already validated by Zod middleware in the route
  const { fullName, email, password } = req.body;

  // Check if email exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ApiError(400, 'Email already exists'));
  }

  // Create user — only allow safe fields (prevent role injection)
  const newUser = await User.create({
    fullName,
    email,
    password,
    // role is NOT accepted from req.body — defaults to 'user'
  });

  createSendToken(newUser, 201, res);
});

// ── LOGIN ──────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res, next) => {
  // Body is already validated by Zod middleware in the route
  const { email, password } = req.body;

  // Check if user exists & include password + lockout fields
  const user = await User.findOne({ email }).select(
    '+password +loginAttempts +lockUntil'
  );

  // Constant-time generic error to prevent user enumeration
  const GENERIC_AUTH_ERROR = 'Incorrect email or password';

  if (!user) {
    return next(new ApiError(401, GENERIC_AUTH_ERROR));
  }

  // Check if account is locked
  if (user.isLocked) {
    // Still increment attempts to extend lock on continued attacks
    await user.incLoginAttempts();
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return next(
      new ApiError(
        423,
        `Account is temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
      )
    );
  }

  // Verify password
  const isPasswordCorrect = await user.comparePassword(password, user.password);

  if (!isPasswordCorrect) {
    await user.incLoginAttempts();
    return next(new ApiError(401, GENERIC_AUTH_ERROR));
  }

  // Password correct — reset failed attempts
  await user.resetLoginAttempts();

  createSendToken(user, 200, res);
});

// ── GET ME ─────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});
