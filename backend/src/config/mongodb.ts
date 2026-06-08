import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectMongoDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dibnow-m9';
  await mongoose.connect(uri);
  logger.info('MongoDB connected', { uri: uri.replace(/\/\/.*@/, '//***@') });
};

export const disconnectMongoDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};
