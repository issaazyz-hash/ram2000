/**
 * useImageUpload Hook
 * 
 * Handles image file selection, validation, compression, and upload.
 * Returns upload progress and handles errors gracefully.
 * 
 * @hook
 * @example
 * ```tsx
 * const { upload, preview, progress, error, reset } = useImageUpload();
 * 
 * const handleUpload = async (file: File) => {
 *   const url = await upload(file);
 *   console.log('Uploaded to:', url);
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import { uploadImage } from '../services/uploadService';

interface UseImageUploadReturn {
  upload: (file: File) => Promise<string>;
  preview: string | null;
  progress: number;
  error: string | null;
  reset: () => void;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const useImageUpload = (): UseImageUploadReturn => {
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const compressImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate new dimensions (max 800px)
          const maxWidth = 800;
          const maxHeight = 800;
          let { width, height } = img;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const upload = useCallback(async (file: File): Promise<string> => {
    setError(null);
    setProgress(0);

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      const errorMsg = `Invalid file type. Accepted types: ${ACCEPTED_TYPES.join(', ')}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = `File size exceeds ${Math.round(MAX_FILE_SIZE / 1024)}KB limit`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // Compress image
      const compressedFile = await compressImage(file);

      // Create temporary preview
      const previewUrl = URL.createObjectURL(compressedFile);
      setPreview(previewUrl);

      // Upload to backend
      const uploadedUrl = await uploadImage(compressedFile, (percent) => {
        setProgress(percent);
      });

      // Replace preview with actual backend URL
      URL.revokeObjectURL(previewUrl);
      setPreview(uploadedUrl);
      
      return uploadedUrl;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      throw err;
    }
  }, [compressImage]);

  const reset = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setProgress(0);
    setError(null);
  }, [preview]);

  return {
    upload,
    preview,
    progress,
    error,
    reset,
  };
};

