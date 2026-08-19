import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema({
  title: String,
  section: String,
  documentId: String,
  page: Number,
  excerpt: String,
  relevanceScore: Number,
}, { _id: false });

const chatMessageSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    evidence: {
      type: [evidenceSchema],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
