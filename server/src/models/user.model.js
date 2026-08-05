import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },

    role: {
      type: String,
      enum: ["student", "vendor", "mess_committee", "college_admin", "super_admin"],
      required: true
    },

    phoneNumber: {
      type: String,
      required: true,
      unique: true
    },
    // Company name is typically only applicable when role is 'vendor'
    companyName: String,

    vendorDocuments: {
      udyamCertificate: String,
      fssaiLicense: String,
      labourLicense: String,
      gstCertificate: String,
      panCard: String,
      aadhaarCard: String
    },

    messAssigned: {
      type: Schema.Types.ObjectId,
      ref: 'Mess'
    },

    collegeId: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: function() {
        return this.role !== 'super_admin';
      }
    },

    isActive: {
      type: Boolean,
      default: true
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    isApprovedByAdmin: {
      type: Boolean,
      default: false
    },

    trustMeter: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },

    bannedUntil: {
      type: Date
    }

  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
