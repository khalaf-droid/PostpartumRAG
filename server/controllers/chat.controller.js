import ChatSession from '../models/ChatSession.js';
import ChatMessage from '../models/ChatMessage.js';
import { chatService } from '../services/chat.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Chat Controller — Security Hardened
 *
 * Security features:
 * - All inputs validated via Zod middleware in routes
 * - User ownership enforced on all session operations
 * - Query length capped to prevent API abuse
 * - Pagination limits on message retrieval
 */

// @desc    Get all chat sessions for current user
// @route   GET /api/chat/sessions
// @access  Private
export const getSessions = asyncHandler(async (req, res, next) => {
  const sessions = await ChatSession.find({ user: req.user.id })
    .sort('-lastActivityAt')
    .limit(50) // Cap results to prevent excessive DB reads
    .select('title messageCount lastActivityAt createdAt'); // Only return needed fields

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: {
      sessions,
    },
  });
});

// @desc    Get a single chat session with its messages
// @route   GET /api/chat/sessions/:id
// @access  Private
export const getSession = asyncHandler(async (req, res, next) => {
  // req.params.id is already validated as ObjectId by Zod middleware
  const session = await ChatSession.findOne({
    _id: req.params.id,
    user: req.user.id, // Ownership check
  });

  if (!session) {
    return next(new ApiError(404, 'No session found with that ID'));
  }

  const messages = await ChatMessage.find({ session: session._id })
    .sort('createdAt')
    .limit(200); // Cap message retrieval

  res.status(200).json({
    status: 'success',
    data: {
      session,
      messages,
    },
  });
});

// @desc    Send a query and get a RAG response
// @route   POST /api/chat/query
// @access  Private
export const sendQuery = asyncHandler(async (req, res, next) => {
  // Body is already validated by Zod middleware (question: 1-2000 chars, sessionId: ObjectId)
  const { question, sessionId } = req.body;

  // 1) Find or create session
  let session;
  let previousMessages = [];

  if (sessionId) {
    session = await ChatSession.findOne({ _id: sessionId, user: req.user.id });
    if (!session) {
      return next(new ApiError(404, 'Session not found'));
    }
    
    // Fetch last 10 messages for conversation context
    previousMessages = await ChatMessage.find({ session: session._id })
      .sort({ createdAt: 1 })
      .limit(10)
      .select('role content -_id');

  } else {
    // Determine title from first few words of the question (sanitized by Zod)
    const title = question.split(' ').slice(0, 5).join(' ') + '...';
    session = await ChatSession.create({
      user: req.user.id,
      title,
    });
  }

  // 2) Save user message to DB
  const userMessage = await ChatMessage.create({
    session: session._id,
    user: req.user.id,
    role: 'user',
    content: question,
  });

  // 3) Call RAG pipeline adapter
  const ragResponse = await chatService.processQuery(question, previousMessages);

  // 4) Save assistant response to DB
  const assistantMessage = await ChatMessage.create({
    session: session._id,
    user: req.user.id,
    role: 'assistant',
    content: ragResponse.answer,
    evidence: ragResponse.evidence,
    metadata: ragResponse.metadata,
  });

  // 5) Update session activity
  await session.updateActivity();

  // 6) Send response back
  res.status(200).json({
    status: 'success',
    data: {
      session,
      userMessage,
      assistantMessage,
    },
  });
});

// @desc    Delete a chat session
// @route   DELETE /api/chat/sessions/:id
// @access  Private
export const deleteSession = asyncHandler(async (req, res, next) => {
  // req.params.id is already validated as ObjectId by Zod middleware
  const session = await ChatSession.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id, // Ownership check
  });

  if (!session) {
    return next(new ApiError(404, 'No session found with that ID'));
  }

  // Also delete all messages associated with the session
  await ChatMessage.deleteMany({ session: session._id });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
