import mongoose from 'mongoose';

const guidelineDocumentSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
    },
    publisher: {
      type: String,
      required: true,
      enum: ['NICE', 'WHO', 'BAP', 'ACOG', 'OTHER'],
    },
    publicationYear: {
      type: Number,
      required: true,
    },
    version: {
      type: String,
      default: '1.0',
    },
    url: {
      type: String,
    },
    totalChunks: {
      type: Number,
      default: 0,
    },
    topics: [
      {
        type: String,
      },
    ],
    summary: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const GuidelineDocument = mongoose.model('GuidelineDocument', guidelineDocumentSchema);
export default GuidelineDocument;
