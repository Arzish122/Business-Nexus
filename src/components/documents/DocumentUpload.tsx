import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  FileText,
  Image,
  File,
} from "lucide-react";
import { API_URL } from "../../config/api";

interface DocumentUploadProps {
  onClose?: () => void;
  onUploadSuccess?: (documents: any[]) => void;
  multiple?: boolean;
  maxFiles?: number;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onClose,
  onUploadSuccess,
  multiple = false,
  maxFiles = 1,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requiresSignature: false,
    isPublic: false,
    
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (multiple) {
        setSelectedFiles((prev) => [...prev, ...acceptedFiles].slice(0, maxFiles));
      } else {
        setSelectedFiles(acceptedFiles.slice(0, 1));
        if (acceptedFiles[0]) {
          setFormData((prev) => ({
            ...prev,
            title: prev.title || acceptedFiles[0].name,
          }));
        }
      }
    },
    [multiple, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
        ".pptx",
      ],
      "text/plain": [".txt"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    multiple,
    maxFiles,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="w-6 h-6 text-blue-500" />;
    } else if (file.type === "application/pdf") {
      return <FileText className="w-6 h-6 text-red-500" />;
    } else {
      return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem("business_nexus_token");
      if (!token) throw new Error("No authentication token found");

      const uploadedDocuments = [];

      if (multiple && selectedFiles.length > 1) {
        const formDataObj = new FormData();
        selectedFiles.forEach((file) => {
          formDataObj.append("documents", file);
        });
        formDataObj.append("requiresSignature", formData.requiresSignature.toString());
        formDataObj.append("isPublic", formData.isPublic.toString());
        

        const response = await fetch(`${API_URL}/documents/upload-multiple`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataObj,
        });

        const result = await response.json();
        if (result.success) uploadedDocuments.push(...result.documents);
        else throw new Error(result.message || "Upload failed");
      } else {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const formDataObj = new FormData();
          formDataObj.append("document", file);
          formDataObj.append("title", formData.title || file.name);
          formDataObj.append("description", formData.description);
          formDataObj.append("requiresSignature", formData.requiresSignature.toString());
          formDataObj.append("isPublic", formData.isPublic.toString());
          

          const response = await fetch(`${API_URL}/documents/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formDataObj,
          });

          const result = await response.json();
          if (result.success) uploadedDocuments.push(result.document);
          else throw new Error(result.message || "Upload failed");

          setUploadProgress(((i + 1) / selectedFiles.length) * 100);
        }
      }

      setSelectedFiles([]);
      setFormData({
        title: "",
        description: "",
        requiresSignature: false,
        isPublic: false,
        
      });

      if (onUploadSuccess) onUploadSuccess(uploadedDocuments);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          Upload Document{multiple ? "s" : ""}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop files here...</p>
        ) : (
          <p className="text-gray-600">
            Drag & drop files or <span className="text-blue-600">browse</span>
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          PDF, Word, Excel, PowerPoint, text & images
        </p>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(file)}
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form Fields */}
      {selectedFiles.length > 0 && (
        <div className="mt-6 space-y-4">
          {!multiple && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter document title"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.requiresSignature}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, requiresSignature: e.target.checked }))
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Requires signature</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Make public</span>
            </label>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {uploading
            ? "Uploading..."
            : `Upload ${selectedFiles.length} file${
                selectedFiles.length > 1 ? "s" : ""
              }`}
        </button>
      )}
    </div>
  );
};

export default DocumentUpload;
