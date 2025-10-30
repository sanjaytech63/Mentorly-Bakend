import mongoose, { Schema, Document } from "mongoose";

interface IContact extends Document {
    fullName: string,
    email: string,
    message: string
};

const contactSchema = new Schema<IContact>({
    fullName: {
        type: String,
        required: [true, "FullName is required"],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
        index: 'text',
        lowercase: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true
    },
    message: {
        type: String,
        required: [true, "Message is required"],
        trim: true,
        lowercase: true,
        index: "text"
    }
}, { timestamps: true })

export default mongoose.model<IContact>("Contact", contactSchema)