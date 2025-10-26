import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
    title: string;
    image: string;
    category: string;
    instructor: string;
    originalPrice: number;
    discountedPrice: number;
    rating: number;
    reviewCount: number;
    duration: string;
    students: number;
    badge?: string;
}

const courseSchema = new Schema<ICourse>(
    {
        title: { type: String, required: true },
        image: { type: String, required: true },
        category: { type: String, required: true },
        instructor: { type: String, required: true },
        originalPrice: { type: Number, required: true },
        discountedPrice: { type: Number, required: true },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        duration: { type: String, required: true },
        students: { type: Number, default: 0 },
        badge: { type: String },
    },
    { timestamps: true }
);

export const CourseModel = mongoose.model<ICourse>('Course', courseSchema);
