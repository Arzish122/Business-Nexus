import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  FileSignature,
  Loader2,
} from "lucide-react";
import DocumentUpload from "./DocumentUpload";
import DocumentsList from "./DocumentsList";
import DocumentViewer from "./DocumentViewer";
import ESignature from "./ESignature";
import { API_URL } from "../../config/api";

interface Document {
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
  status: "draft" | "review" | "approved" | "signed";
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
}

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("business_nexus_token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        throw new Error("Failed to fetch documents");
      }
    } catch (error) {
      console.error("Fetch documents error:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    fetchDocuments();
  };

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setShowViewer(true);
  };

  const handleSignDocument = (doc: Document) => {
    setSelectedDocument(doc);
    setShowSignature(true);
  };

  const handleSignatureAdded = () => {
    fetchDocuments();
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const token = localStorage.getItem("business_nexus_token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(`${API_URL}/documents/${documentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchDocuments();
      } else {
        throw new Error("Failed to delete document");
      }
    } catch (error) {
      console.error("Delete document error:", error);
      alert(error instanceof Error ? error.message : "Failed to delete document");
    }
  };

  const handleApproveDocument = async (doc: Document) => {
    if (!confirm(`Approve "${doc.title}"?`)) return;

    try {
      const token = localStorage.getItem("business_nexus_token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(`${API_URL}/documents/${doc._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });

      if (response.ok) {
        fetchDocuments();
        alert("Document approved successfully!");
      } else {
        throw new Error("Failed to approve document");
      }
    } catch (error) {
      console.error("Approve document error:", error);
      alert(error instanceof Error ? error.message : "Failed to approve document");
    }
  };

  // Filtering logic
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const matchesCategory =
      filterCategory === "all" || doc.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = Array.from(
    new Set(documents.map((doc) => doc.category).filter(Boolean))
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <span className="mt-3 text-gray-600 font-medium">Loading documents...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-red-600 text-lg font-semibold mb-4">{error}</p>
        <button
          onClick={fetchDocuments}
          className="px-5 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Documents
        </h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Upload Document
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Documents</p>
            <p className="text-2xl font-bold text-gray-800">{documents.length}</p>
          </div>
        </div>

        {/* Draft */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <div className="p-3 bg-gray-100 text-gray-600 rounded-full">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Draft</p>
            <p className="text-2xl font-bold text-gray-800">
              {documents.filter((d) => d.status === "draft").length}
            </p>
          </div>
        </div>

        {/* Review */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Under Review</p>
            <p className="text-2xl font-bold text-gray-800">
              {documents.filter((d) => d.status === "review").length}
            </p>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Approved</p>
            <p className="text-2xl font-bold text-gray-800">
              {documents.filter((d) => d.status === "approved").length}
            </p>
          </div>
        </div>

        {/* Signed */}
        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Signed</p>
            <p className="text-2xl font-bold text-gray-800">
              {documents.filter((d) => d.status === "signed").length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search documents..."
            className="pl-10 pr-4 py-2 w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="approved">Approved</option>
          <option value="signed">Signed</option>
        </select>

        <select
          className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <DocumentsList
          documents={filteredDocuments}
          onView={handleViewDocument}
          onSign={handleSignDocument}
          onDelete={handleDeleteDocument}
          onApprove={handleApproveDocument}
        />
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl shadow">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No documents found.</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <DocumentUpload
          onClose={() => setShowUpload(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {/* Viewer Modal */}
      {showViewer && selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setShowViewer(false)}
        />
      )}

      {/* Signature Modal */}
      {showSignature && selectedDocument && (
        <ESignature
          document={selectedDocument}
          onClose={() => setShowSignature(false)}
          onSignatureAdded={handleSignatureAdded}
        />
      )}
    </div>
  );
};

export default Documents;
