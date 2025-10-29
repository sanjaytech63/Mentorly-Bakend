declare module 'cloudinary' {
  export function uploadOnCloudinary(localPath: string): Promise<string | null>;
  // Add other Cloudinary functions you use
}