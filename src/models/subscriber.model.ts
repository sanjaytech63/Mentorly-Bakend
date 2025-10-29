import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriber extends Document {
  email: string;
  status: 'active' | 'inactive';
  subscribedAt: Date;
  unsubscribedAt?: Date;
  source: string;
  ipAddress?: string;
  userAgent?: string;
}

const subscriberSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (email: string) {
          return /\S+@\S+\.\S+/.test(email);
        },
        message: 'Please provide a valid email address',
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
    source: {
      type: String,
      default: 'website',
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

subscriberSchema.index({ email: 1 });
subscriberSchema.index({ status: 1 });
subscriberSchema.index({ subscribedAt: -1 });
subscriberSchema.index({ email: 'text' });

export default mongoose.model<ISubscriber>('Subscriber', subscriberSchema);
