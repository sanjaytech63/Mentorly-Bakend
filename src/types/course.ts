export interface Video {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  resolution: string; // e.g., "1920x1080"
  format: string; // e.g., "mp4", "mov"
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  order: number;
  isPreview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoUploadResponse {
  success: boolean;
  data: {
    video: Video;
    uploadUrl?: string; // For direct uploads
  };
  message?: string;
}

export interface VideoProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}