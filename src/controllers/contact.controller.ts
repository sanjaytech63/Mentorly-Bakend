import { Request, Response } from "express";
import contactModel from "../models/contact.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { z } from "zod";

// ========================
// ZOD VALIDATION SCHEMA
// ========================


const contactSchema = z.object({
    fullName: z
        .string()
        .min(3, "Full name must be at least 3 characters long")
        .max(100, "Full name must not exceed 100 characters"),
    email: z.string().email("Invalid email address"),
    message: z
        .string()
        .min(10, "Message must be at least 10 characters long")
        .max(1000, "Message must not exceed 1000 characters"),
});


export const createContact = asyncHandler(async (req: Request, res: Response) => {

    const parsed = contactSchema.safeParse(req.body);
    
    if (!parsed) {
        throw new ApiError(400, "All fields required !");
    }

    const { fullName, email, message } = parsed.data;

    const newContact = await contactModel.create({ fullName, email, message });

    res.status(201).json(
        new ApiResponse(201, newContact, "Contact message submitted successfully.")
    );
});


export const getContactList = asyncHandler(async (req: Request, res: Response) => {
    const contacts = await contactModel.find().sort({ createdAt: -1 });

    if (!contacts || contacts.length === 0) {
        throw new ApiError(404, "No contacts found!");
    }

    res.status(200).json(
        new ApiResponse(200, contacts, "Contacts fetched successfully.")
    );
});
