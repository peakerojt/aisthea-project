import { useState, useCallback, useRef } from 'react';
import {
    compressImage,
    fileToBase64,
    isValidImageType,
    CompressionResult,
} from '../../utils/imageCompression';

// API base URL - adjust based on your environment
const API_BASE_URL = 'http://localhost:5000/api';

export interface UploadedImage {
    imageId: number;
    imageUrl: string;
    thumbnailUrl: string;
    publicId: string;
}

export interface UploadProgress {
    fileName: string;
    status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
    result?: UploadedImage;
}

export interface ProductImageUploaderProps {
    productId: number;
    variantId?: number;
    variantColor?: string;
    category?: string;
    maxFiles?: number;
    onUploadComplete?: (images: UploadedImage[]) => void;
    onUploadError?: (errors: string[]) => void;
}

export function ProductImageUploader({
    productId,
    variantId,
    variantColor,
    category,
    maxFiles = 20,
    onUploadComplete,
    onUploadError,
}: ProductImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file selection
    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files).slice(0, maxFiles);

        // Validate files
        const validFiles = fileArray.filter(file => {
            if (!isValidImageType(file)) {
                console.warn(`Skipping invalid file type: ${file.name}`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) {
            onUploadError?.(['No valid image files selected']);
            return;
        }

        // Initialize progress
        const initialProgress: UploadProgress[] = validFiles.map(file => ({
            fileName: file.name,
            status: 'pending',
            progress: 0,
        }));
        setUploadProgress(initialProgress);
        setIsUploading(true);

        const uploadedImages: UploadedImage[] = [];
        const errors: string[] = [];

        // Process files with controlled concurrency
        const CONCURRENCY = 3;
        for (let i = 0; i < validFiles.length; i += CONCURRENCY) {
            const batch = validFiles.slice(i, i + CONCURRENCY);

            await Promise.allSettled(
                batch.map(async (file, batchIndex) => {
                    const fileIndex = i + batchIndex;

                    try {
                        // Update status: Compressing
                        setUploadProgress(prev => prev.map((p, idx) =>
                            idx === fileIndex ? { ...p, status: 'compressing', progress: 10 } : p
                        ));

                        // Compress image
                        const compressed: CompressionResult = await compressImage(file, {
                            maxSizeMB: 1,
                            maxWidthOrHeight: 1500,
                        });

                        // Update status: Uploading
                        setUploadProgress(prev => prev.map((p, idx) =>
                            idx === fileIndex ? { ...p, status: 'uploading', progress: 50 } : p
                        ));

                        // Convert to FormData for upload
                        const formData = new FormData();
                        formData.append('file', compressed.file);
                        if (variantId) formData.append('variantId', String(variantId));
                        if (variantColor) formData.append('variantColor', variantColor);
                        if (category) formData.append('category', category);
                        formData.append('isPrimary', fileIndex === 0 ? 'true' : 'false');

                        // Upload to server
                        const response = await fetch(
                            `${API_BASE_URL}/products/${productId}/image`,
                            {
                                method: 'POST',
                                body: formData,
                                credentials: 'include',
                            }
                        );

                        const data = await response.json();

                        if (!response.ok || !data.success) {
                            throw new Error(data.error || 'Upload failed');
                        }

                        // Update status: Success
                        setUploadProgress(prev => prev.map((p, idx) =>
                            idx === fileIndex ? {
                                ...p,
                                status: 'success',
                                progress: 100,
                                result: data.data,
                            } : p
                        ));

                        uploadedImages.push(data.data);
                    } catch (error: unknown) {
                        const errorMessage = (error as Error).message || 'Unknown error';
                        errors.push(`${file.name}: ${errorMessage}`);

                        // Update status: Error
                        setUploadProgress(prev => prev.map((p, idx) =>
                            idx === fileIndex ? {
                                ...p,
                                status: 'error',
                                progress: 0,
                                error: errorMessage,
                            } : p
                        ));
                    }
                })
            );
        }

        setIsUploading(false);

        if (uploadedImages.length > 0) {
            onUploadComplete?.(uploadedImages);
        }

        if (errors.length > 0) {
            onUploadError?.(errors);
        }
    }, [productId, variantId, variantColor, category, maxFiles, onUploadComplete, onUploadError]);

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, [handleFiles]);

    // Click to select files
    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    }, [handleFiles]);

    // Clear completed uploads
    const clearCompleted = useCallback(() => {
        setUploadProgress(prev => prev.filter(p => p.status !== 'success'));
    }, []);

    // Get status counts
    const successCount = uploadProgress.filter(p => p.status === 'success').length;
    const errorCount = uploadProgress.filter(p => p.status === 'error').length;
    const pendingCount = uploadProgress.filter(p =>
        p.status === 'pending' || p.status === 'compressing' || p.status === 'uploading'
    ).length;

    return (
        <div className="product-image-uploader">
            {/* Drop Zone */}
            <div
                className={`drop-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                style={{
                    border: '2px dashed',
                    borderColor: isDragging ? '#3b82f6' : '#d1d5db',
                    borderRadius: '12px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
                    transition: 'all 0.2s ease',
                    opacity: isUploading ? 0.7 : 1,
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                />

                <div style={{ marginBottom: '12px' }}>
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                        style={{ margin: '0 auto' }}
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>

                <p style={{ margin: 0, color: '#374151', fontWeight: 500 }}>
                    {isUploading ? 'Uploading...' : 'Drop images here or click to browse'}
                </p>
                <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: '14px' }}>
                    Max {maxFiles} images • JPEG, PNG, GIF, WebP • Auto-compressed
                </p>
            </div>

            {/* Progress List */}
            {uploadProgress.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                    }}>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>
                            {successCount > 0 && <span style={{ color: '#10b981' }}>✓ {successCount} uploaded </span>}
                            {errorCount > 0 && <span style={{ color: '#ef4444' }}>✗ {errorCount} failed </span>}
                            {pendingCount > 0 && <span>⏳ {pendingCount} pending</span>}
                        </span>
                        {successCount > 0 && (
                            <button
                                onClick={clearCompleted}
                                style={{
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                    background: 'none',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                Clear completed
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {uploadProgress.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    width: '120px',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                }}
                            >
                                {/* Thumbnail Preview */}
                                {item.result?.thumbnailUrl ? (
                                    <img
                                        src={item.result.thumbnailUrl}
                                        alt={item.fileName}
                                        style={{
                                            width: '100%',
                                            height: '80px',
                                            objectFit: 'cover',
                                            borderRadius: '4px',
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '80px',
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {item.status === 'error' ? (
                                            <span style={{ color: '#ef4444', fontSize: '24px' }}>✗</span>
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                {item.progress}%
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* File name */}
                                <p
                                    style={{
                                        margin: '8px 0 0',
                                        fontSize: '11px',
                                        color: '#6b7280',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                    title={item.fileName}
                                >
                                    {item.fileName}
                                </p>

                                {/* Status */}
                                <p
                                    style={{
                                        margin: '4px 0 0',
                                        fontSize: '10px',
                                        color: item.status === 'success' ? '#10b981' :
                                            item.status === 'error' ? '#ef4444' : '#3b82f6',
                                        fontWeight: 500,
                                    }}
                                >
                                    {item.status === 'compressing' && '⚙️ Compressing...'}
                                    {item.status === 'uploading' && '⬆️ Uploading...'}
                                    {item.status === 'success' && '✓ Done'}
                                    {item.status === 'error' && `✗ ${item.error?.slice(0, 20)}...`}
                                    {item.status === 'pending' && '⏳ Waiting...'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductImageUploader;
