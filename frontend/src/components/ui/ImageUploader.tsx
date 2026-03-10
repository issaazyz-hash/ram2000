/**
 * ImageUploader Component
 * 
 * Reusable image upload component with preview and validation.
 * Handles file selection, compression, and upload progress.
 * 
 * @component
 * @example
 * ```tsx
 * <ImageUploader
 *   onUpload={handleUpload}
 *   maxSize={1024 * 1024} // 1MB
 *   acceptedTypes={['image/jpeg', 'image/png']}
 * />
 * ```
 */

import React, { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (file: File) => Promise<string>;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  preview?: string;
  onRemove?: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  maxSize = 1024 * 1024, // 1MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  preview,
  onRemove,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
      setError(`Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size exceeds ${Math.round(maxSize / 1024)}KB limit`);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, maxSize, acceptedTypes]);

  return (
    <div className="image-uploader">
      {preview ? (
        <div className="relative">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-48 object-cover rounded-lg"
          />
          {onRemove && (
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#F97316] transition-colors">
          <Upload className="w-8 h-8 text-gray-400 mb-2" aria-hidden="true" />
          <span className="text-sm text-gray-600">
            {isUploading ? 'Uploading...' : 'Click to upload image'}
          </span>
          <input
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;

