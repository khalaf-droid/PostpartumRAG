import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: 'New Chat Session',
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Update lastActivityAt on message save
chatSessionSchema.methods.updateActivity = async function () {
  this.lastActivityAt = Date.now();
  this.messageCount += 1;
  return this.save();
};

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
