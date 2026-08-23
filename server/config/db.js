import mongoose from 'mongoose';

/**
 * Database Connection — Security Hardened
 *
 * Security features:
 * - Connection timeout to prevent hanging
 * - Strict query mode to prevent accidental data leaks
 * - Auto-index disabled in production (performance + security)
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // ── Connection reliability ──────────────────────────────
      serverSelectionTimeoutMS: 10000,  // 10s timeout for server selection
      socketTimeoutMS: 45000,           // 45s timeout for socket operations
      connectTimeoutMS: 10000,          // 10s timeout for initial connection
      heartbeatFrequencyMS: 10000,      // Check server health every 10s

      // ── Security & performance ──────────────────────────────
      autoIndex: process.env.NODE_ENV !== 'production', // Disable auto-index in production
      maxPoolSize: 10,                  // Limit concurrent connections
      minPoolSize: 2,                   // Keep minimum connections alive
    });

    // Enable strict query mode — prevents undefined fields from returning all documents
    mongoose.set('strictQuery', true);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // Don't log the full connection string (contains credentials)
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};
