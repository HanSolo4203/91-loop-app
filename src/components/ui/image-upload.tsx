'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Upload, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  label?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  previewSize?: 'sm' | 'md' | 'lg';
  showPreview?: boolean;
  bucket?: string;
  folder?: string;
}

const DEFAULT_MAX_SIZE = 2; // 2MB
const DEFAULT_ACCEPTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];

export default function ImageUpload({
  label = 'Upload Image',
  value,
  onChange,
  onError,
  disabled = false,
  className = '',
  maxSizeMB = DEFAULT_MAX_SIZE,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
  previewSize = 'md',
  showPreview = true,
  bucket = 'client-logos',
  folder = 'logos',
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file format
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      return `File format not supported. Accepted formats: ${acceptedFormats.join(', ')}`;
    }

    return null;
  }, [maxSizeMB, acceptedFormats]);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setIsUploading(true);

    try {
      // Create preview URL for immediate feedback
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Upload to Supabase Storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      formData.append('folder', folder);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Clean up preview URL and use the real URL
      URL.revokeObjectURL(previewUrl);
      setPreview(null);
      onChange(result.data.url);
      setIsUploading(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsUploading(false);
      
      // Clean up preview URL on error
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
    }
  }, [validateFile, onChange, onError, bucket, folder, preview]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleRemove = useCallback(async () => {
    try {
      // If there's a current value (uploaded file), try to delete it from storage
      if (value && value.includes('storage/v1/object/public')) {
        // Extract file path from the URL
        const urlParts = value.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const pathParts = urlParts[1].split('/');
          const filePath = pathParts.slice(1).join('/'); // Remove bucket name
          
          const response = await fetch(`/api/upload?path=${encodeURIComponent(filePath)}&bucket=${bucket}`, {
            method: 'DELETE',
          });
          
          // Don't throw error if delete fails - just log it
          if (!response.ok) {
            console.warn('Failed to delete file from storage:', await response.text());
          }
        }
      }
    } catch (err) {
      console.warn('Error deleting file from storage:', err);
    }

    // Clean up local state regardless of storage deletion success
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [preview, onChange, value, bucket]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const getPreviewSizeClasses = () => {
    switch (previewSize) {
      case 'sm':
        return 'w-16 h-16';
      case 'lg':
        return 'w-32 h-32';
      default:
        return 'w-24 h-24';
    }
  };

  const currentImage = value || preview;

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label}
        </Label>
      )}

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-slate-300 hover:border-slate-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        <div className="text-center">
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-slate-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Upload className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {isDragOver ? 'Drop image here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-slate-500">
                  {acceptedFormats.join(', ')} up to {maxSizeMB}MB
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {showPreview && currentImage && (
        <div className="relative inline-block">
          <div className={`relative ${getPreviewSizeClasses()} rounded-lg overflow-hidden border border-slate-200`}>
            <Image
              src={currentImage}
              alt="Preview"
              fill
              className="object-cover"
              onError={() => setError('Failed to load image preview')}
            />
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Image Display (for editing) */}
      {!preview && value && showPreview && (
        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
          <div className={`relative ${getPreviewSizeClasses()} rounded-lg overflow-hidden border border-slate-200`}>
            <Image
              src={value}
              alt="Current logo"
              fill
              className="object-cover"
              onError={() => setError('Failed to load current image')}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">Current logo</p>
            <p className="text-xs text-slate-500">Click above to replace</p>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
