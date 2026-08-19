import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const protect = asyncHandler(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'You are not logged in! Please log in to get access.'));
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_ACCESS_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new ApiError(401, 'The user belonging to this token does no longer exist.'));
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});
