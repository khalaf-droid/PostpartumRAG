import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Authentication Middleware — Security Hardened
 *
 * Security features:
 * - Token format validation
 * - User existence verification
 * - Password change check (invalidates tokens issued before password change)
 * - Account lock check (prevents locked accounts from using existing tokens)
 */
export const protect = asyncHandler(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'You are not logged in! Please log in to get access.'));
  }

  // 2) Basic token format validation (JWT has 3 parts separated by dots)
  if (token.split('.').length !== 3) {
    return next(new ApiError(401, 'Invalid token format.'));
  }

  // 3) Verify token
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Your token has expired. Please log in again.'));
    }
    return next(new ApiError(401, 'Invalid token. Please log in again.'));
  }

  // 4) Check if user still exists
  const currentUser = await User.findById(decoded.id).select('+lockUntil');
  if (!currentUser) {
    return next(new ApiError(401, 'The user belonging to this token no longer exists.'));
  }

  // 5) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new ApiError(401, 'User recently changed password. Please log in again.')
    );
  }

  // 6) Check if account is locked
  if (currentUser.lockUntil && currentUser.lockUntil > Date.now()) {
    return next(
      new ApiError(423, 'Account is temporarily locked. Please try again later.')
    );
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});
