/**
 * Upload Service
 * 
 * API calls for image upload operations.
 */

export interface ImageUploadResult {
  success: boolean;
  url: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

import { getApiBaseUrl } from '@/utils/apiConfig';

/**
 * Upload image file
 */
export const uploadImage = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  // Use XMLHttpRequest for upload progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total);
          onProgress(percent);
        }
      });
    }

    // Handle response
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          
          if (!result.success) {
            reject(new Error(result.error || 'Upload failed'));
            return;
          }

          // Backend returns { success: true, data: { url, ... } }
          const imageUrl = result.data?.url || result.url;
          if (!imageUrl) {
            reject(new Error('No image URL in response'));
            return;
          }

          resolve(imageUrl);
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error || `Upload failed: ${xhr.statusText}`));
        } catch {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Send request
    const apiBaseUrl = getApiBaseUrl();
    xhr.open('POST', `${apiBaseUrl}/upload/image`);
    xhr.send(formData);
  });
};

/**
 * Delete image
 */
export const deleteImage = async (url: string, filename?: string): Promise<void> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/upload/image`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, filename }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete image');
  }
};

