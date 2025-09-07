import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, X, RotateCw } from 'lucide-react';
import { API_URL, API_BASE_URL } from '../../config/api';

// Configure PDF.js worker with better compatibility
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

interface DocumentViewerProps {
  document: {
    _id: string;
    title: string;
    description: string;
    originalName: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
    uploadedBy: {
      _id: string;
      name: string;
      email: string;
    };
    version: number;
    status: 'draft' | 'review' | 'approved' | 'signed';
    category: string;
    tags: string[];
    isPublic: boolean;
    requiresSignature: boolean;
    signatures: Array<{
      signedBy: {
        _id: string;
        name: string;
        email: string;
      };
      signatureImageUrl: string;
      signedAt: string;
      ipAddress: string;
    }>;
    createdAt: string;
    updatedAt: string;
  } | null;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      setPageNumber(1);
      setScale(1.0);
      setRotation(0);
      setLoading(true);
      setError(null);
    }
  }, [document]);

  if (!document) {
    return null;
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load document');
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('business_nexus_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/documents/${document._id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document?.originalName || 'download';
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(error instanceof Error ? error.message : 'Download failed');
    }
  };

  const isPDF = document.mimeType === 'application/pdf';
  const isImage = document.mimeType.startsWith('image/');
  const fileUrl = `${API_BASE_URL}${document.fileUrl}`;
  
  // Create file object with authentication headers for PDF.js
  const fileObject = isPDF ? {
    url: fileUrl,
    httpHeaders: {
      'Authorization': `Bearer ${localStorage.getItem('business_nexus_token') || ''}`,
    },
    withCredentials: false
  } : fileUrl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
            <p className="text-sm text-gray-500">{document.originalName}</p>
          </div>
          <div className="flex items-center space-x-2">
            {isPDF && (
              <>
                <button
                  onClick={zoomOut}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 px-2">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={rotate}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading document...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 mb-2">{error}</p>
                <p className="text-gray-500 text-sm">This document type may not be supported for preview.</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="flex justify-center">
              {isPDF ? (
                <div className="border border-gray-300 shadow-lg">
                  <Document
                    file={fileObject}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={(
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      rotate={rotation}
                      loading={(
                        <div className="flex items-center justify-center h-64">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    />
                  </Document>
                </div>
              ) : isImage ? (
                <div className="border border-gray-300 shadow-lg">
                  <img
                    src={fileUrl}
                    alt={document.title}
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${scale}) rotate(${rotation}deg)`
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Preview not available for this file type.</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Download to View
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - PDF Navigation */}
        {isPDF && numPages > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Page {pageNumber} of {numPages}
              </span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNumber}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= numPages) {
                      setPageNumber(page);
                    }
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                />
                <span className="text-sm text-gray-600">/ {numPages}</span>
              </div>
            </div>

            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;