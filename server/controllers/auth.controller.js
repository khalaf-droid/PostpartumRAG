import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

export const register = asyncHandler(async (req, res, next) => {
  const { fullName, email, password } = req.body;

  // 1) Check if email exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ApiError(400, 'Email already exists'));
  }

  // 2) Create user
  const newUser = await User.create({
    fullName,
    email,
    password,
  });

  createSendToken(newUser, 201, res);
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new ApiError(400, 'Please provide email and password'));
  }

  // 2) Check if user exists & password is correct
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new ApiError(401, 'Incorrect email or password'));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});
