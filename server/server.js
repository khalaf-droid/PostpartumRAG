import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import app from './app.js';

// Load env vars
dotenv.config();

const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}).catch((err) => {
  console.error(`❌ Server failed to start: ${err.message}`);
  process.exit(1);
});
