import mongoose, { Schema, Document } from 'mongoose';

export interface IBlogs extends Document {
  title: string;
  description: string;
  image: string;
  author: string;
  category: string;
  readTime?: string;
  badge?: string;
}

const blogSchema = new Schema<IBlogs>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    readTime: { type: String },
    badge: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IBlogs>('Blog', blogSchema);
