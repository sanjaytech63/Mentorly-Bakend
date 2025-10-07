import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!
});

const uploadOnCloudinary = async (localFilePath: string) => {
    if (!localFilePath) return null;

    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        console.log("File uploaded to Cloudinary:", response.secure_url);

        // Delete the temporary local file
        fs.unlink(localFilePath, (err) => {
            if (err) console.error("Failed to remove temp file:", err);
        });

        return response.secure_url;

    } catch (error) {
        console.error("Cloudinary upload error:", error);

        // Remove the temp file even if upload fails
        fs.unlink(localFilePath, (err) => {
            if (err) console.error("Failed to remove temp file after error:", err);
        });

        return null;
    }
};

export { uploadOnCloudinary };
