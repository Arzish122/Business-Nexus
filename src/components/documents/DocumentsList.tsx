import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Trash2, Edit, Filter, Search, Calendar, User, Tag, PenTool, CheckCircle } from 'lucide-react';
import { API_URL } from '../../config/api';

interface Document {
  _id: string;
  title: string;
  description: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  version: number;
  status: 'draft' | 'review' | 'approved' | 'signed';
  category: string;
  isPublic: boolean;
  tags: string[];
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
  requiresSignature: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DocumentsListProps {
  documents?: Document[];
  onView?: (document: Document) => void;
  onSign?: (document: Document) => void;
  onDelete?: (documentId: string) => void;
  onRefresh?: () => void;
  onDocumentSelect?: (document: Document) => void;
  onDocumentEdit?: (document: Document) => void;
  onApprove?: (document: Document) => void;
  refreshTrigger?: number;
}

const DocumentsList: React.FC<DocumentsListProps> = ({ 
  documents: propDocuments,
  onView,
  onSign,
  onDelete,
  onRefresh,
  onDocumentSelect, 
  onDocumentEdit,
  onApprove,
  refreshTrigger 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    page: 1,
    limit: 10
  });
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('business_nexus_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.category !== 'all') queryParams.append('category', filters.category);
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`${API_URL}/documents?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setDocuments(result.documents);
        setTotalPages(result.totalPages);
      } else {
        throw new Error(result.message || 'Failed to fetch documents');
      }
    } catch (error) {
      console.error('Fetch documents error:', error);
      alert(error instanceof Error ? error.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propDocuments) {
      setDocuments(propDocuments);
      setLoading(false);
    } else {
      fetchDocuments();
    }
  }, [propDocuments, filters, refreshTrigger]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (documentId: string) => {
    if (onDelete) {
      onDelete(documentId);
      return;
    }

    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = localStorage.getItem('business_nexus_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setDocuments(prev => prev.filter(doc => doc._id !== documentId));
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.message || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete document error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete document');
    }
  };

  const handleDownload = async (document: Document) => {
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
        a.download = document.originalName;
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'signed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'contract': return 'bg-purple-100 text-purple-800';
      case 'proposal': return 'bg-blue-100 text-blue-800';
      case 'legal': return 'bg-red-100 text-red-800';
      case 'financial': return 'bg-green-100 text-green-800';
      case 'presentation': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">
            Documents ({documents.length})
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Search and Filters */}
        {showFilters && (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleSearch} className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Search
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="contract">Contract</option>
                  <option value="proposal">Proposal</option>
                  <option value="legal">Legal</option>
                  <option value="financial">Financial</option>
                  <option value="presentation">Presentation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="signed">Signed</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No documents found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div key={document._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <h4 className="text-lg font-medium text-gray-900">{document.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                        {document.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                        {document.category}
                      </span>
                    </div>

                    {document.description && (
                      <p className="text-gray-600 mb-2">{document.description}</p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{document.uploadedBy.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(document.createdAt)}</span>
                      </div>
                      <span>{formatFileSize(document.fileSize)}</span>
                      {document.requiresSignature && (
                        <span className="text-orange-600 font-medium">Requires Signature</span>
                      )}
                      {document.isPublic && (
                        <span className="text-green-600 font-medium">Public</span>
                      )}
                    </div>

                    {document.tags.length > 0 && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {document.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {document.signatures.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-green-600">
                          Signed by {document.signatures.length} user{document.signatures.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        if (onView) {
                          onView(document);
                        } else if (onDocumentSelect) {
                          onDocumentSelect(document);
                        }
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {document.requiresSignature && onSign && (
                      <button
                        onClick={() => onSign(document)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-md"
                        title="Sign Document"
                      >
                        <PenTool className="w-4 h-4" />
                      </button>
                    )}
                    {document.status === 'review' && onApprove && (
                      <button
                        onClick={() => onApprove(document)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                        title="Approve Document"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(document)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {onDocumentEdit && (
                      <button
                        onClick={() => onDocumentEdit(document)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-md"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(document._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={filters.page === 1}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {filters.page} of {totalPages}
            </span>
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={filters.page === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsList;