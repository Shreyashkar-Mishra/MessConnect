import mongoose, { Schema } from 'mongoose';

const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: false
    },
    otp: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: 300 } // TTL index — MongoDB auto-deletes document after 5 minutes
    }
  }
);

export default mongoose.model('Otp', otpSchema);
