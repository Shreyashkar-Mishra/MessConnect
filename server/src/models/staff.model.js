import mongoose, { Schema } from 'mongoose';

const staffSchema = new Schema(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'User', 
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    phoneNumber: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ['Cook', 'Cleaner', 'Cashier', 'Manager'],
      required: true
    },

    joiningDate: {
      type: Date,
      default: Date.now
    },

    salary: {
      type: Number
    },

    documents: {
      identityProof: String,
      policeVerification: String,
      medicalReport: String
    },

    isApprovedByAdmin: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    mess: {
      type: Schema.Types.ObjectId,
      ref: 'Mess',
      required: true
    },

    collegeId: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: true
    }
  },
  { timestamps: true }
);

// Optional: prevent duplicate phone per vendor
staffSchema.index({ vendor: 1, phoneNumber: 1 }, { unique: true });

export default mongoose.model('Staff', staffSchema);
