import React, { useRef, useState, useEffect } from 'react';
import { X, Save, RotateCcw, Download } from 'lucide-react';
import { API_URL } from '../../config/api';

interface ESignatureProps {
  document: {
    _id: string;
    title: string;
    originalName: string;
  } | null;
  onClose: () => void;
  onSignatureAdded: () => void;
}

const ESignature: React.FC<ESignatureProps> = ({ document, onClose, onSignatureAdded }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [signatureName, setSignatureName] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  if (!document) {
    return null;
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setLastPosition({ x, y });
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastPosition({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = async () => {
    if (!hasSignature || !signatureName.trim()) {
      alert('Please provide your name and create a signature');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);

    try {
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Failed to create signature image');
        }

        const formData = new FormData();
        formData.append('signature', blob, 'signature.png');
        formData.append('signerName', signatureName.trim());
        formData.append('documentId', document._id);

        const token = localStorage.getItem('business_nexus_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_URL}/documents/${document._id}/sign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          alert('Signature added successfully!');
          onSignatureAdded();
          onClose();
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save signature');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Signature save error:', error);
      alert(error instanceof Error ? error.message : 'Failed to save signature');
    } finally {
      setLoading(false);
    }
  };

  // Touch events for mobile support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setIsDrawing(true);
    setLastPosition({ x, y });
    setHasSignature(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastPosition({ x, y });
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">E-Signature</h3>
            <p className="text-sm text-gray-500">Sign: {document.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Signer Name Input */}
          <div className="mb-4">
            <label htmlFor="signerName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Full Name *
            </label>
            <input
              type="text"
              id="signerName"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Signature Canvas */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Draw Your Signature *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="border border-gray-300 rounded cursor-crosshair w-full"
                style={{ maxWidth: '100%', height: 'auto' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
              <p className="text-xs text-gray-500 mt-2">
                Draw your signature in the box above using your mouse or touch screen
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={clearSignature}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={!hasSignature}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Clear</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                disabled={loading || !hasSignature || !signatureName.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{loading ? 'Saving...' : 'Save Signature'}</span>
              </button>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Legal Notice:</strong> By signing this document electronically, you agree that your electronic signature 
              is the legal equivalent of your manual signature and that you are legally bound by the terms of this document.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ESignature;