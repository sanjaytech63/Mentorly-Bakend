import mongoose, { Document, Schema } from 'mongoose';
import { BlogCategory, BlogBadge } from '../validations/news.validator';

export interface IBlog extends Document {
  title: string;
  description: string;
  author: string;
  category: BlogCategory;
  readTime: string;
  badge?: BlogBadge;
  image: string
  slug: string;
  tags: string[];
  isPublished: boolean;
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: 'text',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['frontend', 'backend', 'fullstack', 'webdesign', 'mobile', 'devops', 'cybersecurity', 'testing'],
        message: 'Category must be one of: frontend, backend, fullstack, webdesign, mobile, devops, cybersecurity, testing',
      },
      index: true,
    },
    readTime: {
      type: String,
      required: [true, 'Read time is required'],
    },
    badge: {
      type: String,
      enum: {
        values: ['new', 'trending', 'popular', 'featured', 'recommended'],
        message: 'Invalid badge value',
      },
      default: null,
    },
    image: {
      type: String,
      required: [true, 'Image is required'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
  },
  {
    timestamps: true,
  }
);

blogSchema.pre<IBlog>('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!this.seo.metaTitle) {
      this.seo.metaTitle = this.title;
    }
    if (!this.seo.metaDescription) {
      this.seo.metaDescription = this.description.substring(0, 160);
    }
  }
  next();
});

blogSchema.index({ title: 'text', description: 'text', author: 'text' });
blogSchema.index({ category: 1, createdAt: -1 });
blogSchema.index({ isPublished: 1, createdAt: -1 });

export default mongoose.model<IBlog>('Blog', blogSchema);