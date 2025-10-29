import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description?: string;
  image: string;
  category: string;
  instructor: string;
  originalPrice: number;
  discountedPrice?: number;
  rating: number;
  reviewCount: number;
  duration: string;
  students: number;
  badge?: string;
  icon?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  discountPercentage?: number;
  totalHours: number;
  lectures: number;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: 'text',
    },
    description: {
      type: String,
      trim: true,
      index: 'text',
    },
    image: {
      type: String,
      required: [true, 'Course image is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'frontend',
          'backend',
          'fullstack',
          'webdesign',
          'mobile',
          'devops',
          'cybersecurity',
          'testing',
        ],
        message:
          'Category must be one of: frontend, backend, fullstack, webdesign, mobile, devops, cybersecurity, testing',
      },
      index: true,
    },
    instructor: {
      type: String,
      required: [true, 'Instructor name is required'],
      trim: true,
    },
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0, 'Price cannot be negative'],
      index: true,
    },
    discountedPrice: {
      type: Number,
      min: [0, 'Discounted price cannot be negative'],
      validate: {
        validator: function (this: ICourse, value: number) {
          return !value || value <= this.originalPrice;
        },
        message: 'Discounted price cannot be higher than original price',
      },
      index: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
      index: true,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
    },
    students: {
      type: Number,
      default: 0,
      min: 0,
    },
    badge: {
      type: String,
      enum: {
        values: ['new', 'trending', 'popular', 'featured', 'recommended'],
        message: 'Invalid badge value',
      },
      default: null,
    },
    icon: {
      type: String,
      trim: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    totalHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    lectures: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    // toJSON: {
    //   transform: (doc, ret) => {
    //     ret.id = ret._id;

    //     // Calculate discount percentage if not set
    //     if (ret.discountedPrice && ret.originalPrice) {
    //       ret.discountPercentage = Math.round(((ret.originalPrice - ret.discountedPrice) / ret.originalPrice) * 100);
    //     }

    //     delete ret._id;
    //     delete ret.__v;
    //     return ret;
    //   }
    // }
  }
);

// Virtual for discount percentage
courseSchema.virtual('calculatedDiscount').get(function () {
  if (this.discountedPrice && this.originalPrice) {
    return Math.round(((this.originalPrice - this.discountedPrice) / this.originalPrice) * 100);
  }
  return 0;
});

// Compound indexes for better query performance
courseSchema.index({ category: 1, isActive: 1, rating: -1 });
courseSchema.index({ originalPrice: 1, discountedPrice: 1 });
courseSchema.index({ rating: -1, reviewCount: -1 });
courseSchema.index({ isFeatured: -1, createdAt: -1 });
courseSchema.index({ students: -1, rating: -1 });
courseSchema.index({
  title: 'text',
  description: 'text',
  instructor: 'text',
  tags: 'text',
});

// Pre-save middleware to calculate discount percentage
courseSchema.pre('save', function (next) {
  if (this.discountedPrice && this.originalPrice && this.originalPrice > 0) {
    this.discountPercentage = Math.round(
      ((this.originalPrice - this.discountedPrice) / this.originalPrice) * 100
    );
  }
  next();
});

export const CourseModel = mongoose.model<ICourse>('Course', courseSchema);
