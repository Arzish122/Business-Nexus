const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const authMiddleware = require('../middleware/auth');
const { uploadDocument, uploadSignature, uploadMultipleDocuments, handleUploadError } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   POST /api/documents/upload
// @desc    Upload a single document
// @access  Private
router.post('/upload', uploadDocument.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { title, description, requiresSignature, isPublic } = req.body;

    // Create document record
    const document = new Document({
      title: title || req.file.originalname,
      description: description || '',
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.id,
      requiresSignature: requiresSignature === 'true',
      isPublic: isPublic === 'true',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await document.save();

    // Populate uploadedBy field for response
    await document.populate('uploadedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during document upload'
    });
  }
});

// @route   POST /api/documents/upload-multiple
// @desc    Upload multiple documents
// @access  Private
router.post('/upload-multiple', uploadMultipleDocuments.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { requiresSignature, isPublic } = req.body;
    const documents = [];

    for (const file of req.files) {
      const document = new Document({
        title: file.originalname,
        fileName: file.filename,
        originalName: file.originalname,
        fileUrl: `/uploads/documents/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: req.user.id,
        requiresSignature: requiresSignature === 'true',
        isPublic: isPublic === 'true',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : []
      });

      await document.save();
      await document.populate('uploadedBy', 'name email');
      documents.push(document);
    }

    res.status(201).json({
      success: true,
      message: `${documents.length} documents uploaded successfully`,
      documents
    });
  } catch (error) {
    console.error('Multiple document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during document upload'
    });
  }
});

// @route   GET /api/documents
// @desc    Get all documents for the user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status, search } = req.query;
    const query = {
      $or: [
        { uploadedBy: req.user.id },
        { 'sharedWith.user': req.user.id },
        { isPublic: true }
      ]
    };

    // Add filters
    if (category && category !== 'all') {
      query.category = category;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      });
    }

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .populate('sharedWith.user', 'name email')
      .populate('signatures.signedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      documents,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching documents'
    });
  }
});

// @route   GET /api/documents/:id
// @desc    Get a specific document
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('sharedWith.user', 'name email')
      .populate('signatures.signedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check access permissions
    // @route   GET /api/documents/:id/download
// @desc    Download document file
// @access  Private (all logged-in users)
router.get('/:id/download', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const filePath = path.join(__dirname, '../../uploads/documents', document.fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // ✅ No ownership check, any authenticated user can download
    res.download(filePath, document.originalName);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while downloading document'
    });
  }
});


    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching document'
    });
  }
});

// @route   PUT /api/documents/:id
// @desc    Update document metadata
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user owns the document or has edit permission
    const canEdit = 
      document.uploadedBy.toString() === req.user.id ||
      document.sharedWith.some(share => 
        share.user.toString() === req.user.id && share.permission === 'edit'
      );

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const { title, description, category, status, requiresSignature, isPublic, tags } = req.body;

    // Update fields
    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (category) document.category = category;
    if (status) document.status = status;
    if (requiresSignature !== undefined) document.requiresSignature = requiresSignature;
    if (isPublic !== undefined) document.isPublic = isPublic;
    if (tags) document.tags = tags;

    await document.save();
    await document.populate('uploadedBy', 'name email');
    await document.populate('sharedWith.user', 'name email');
    await document.populate('signatures.signedBy', 'name email');

    res.json({
      success: true,
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating document'
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Only document owner can delete
    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../uploads/documents', document.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete signature files if any
    for (const signature of document.signatures) {
      const signaturePath = path.join(__dirname, '../../uploads/signatures', path.basename(signature.signatureImageUrl));
      if (fs.existsSync(signaturePath)) {
        fs.unlinkSync(signaturePath);
      }
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting document'
    });
  }
});

// @route   POST /api/documents/:id/share
// @desc    Share document with other users
// @access  Private
router.post('/:id/share', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Only document owner can share
    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    const { userId, permission = 'view' } = req.body;

    // Check if already shared with this user
    const existingShare = document.sharedWith.find(share => share.user.toString() === userId);
    if (existingShare) {
      existingShare.permission = permission;
    } else {
      document.sharedWith.push({ user: userId, permission });
    }

    await document.save();
    await document.populate('sharedWith.user', 'name email');

    res.json({
      success: true,
      message: 'Document shared successfully',
      sharedWith: document.sharedWith
    });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sharing document'
    });
  }
});

// @route   POST /api/documents/:id/sign
// @desc    Add signature to document
// @access  Private
router.post('/:id/sign', uploadSignature.single('signature'), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No signature file uploaded'
      });
    }

    // Check if user has permission to sign
    const canSign = 
      document.uploadedBy.toString() === req.user.id ||
      document.sharedWith.some(share => 
        share.user.toString() === req.user.id && share.permission === 'sign'
      );

    if (!canSign) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied to sign this document'
      });
    }

    // Check if user already signed
    const existingSignature = document.signatures.find(sig => sig.signedBy.toString() === req.user.id);
    if (existingSignature) {
      return res.status(400).json({
        success: false,
        message: 'You have already signed this document'
      });
    }

    // Add signature
    document.signatures.push({
      signedBy: req.user.id,
      signatureImageUrl: `/uploads/signatures/${req.file.filename}`,
      ipAddress: req.ip
    });

    // Update document status if all required signatures are collected
    if (document.requiresSignature) {
      document.status = 'signed';
    }

    await document.save();
    await document.populate('signatures.signedBy', 'name email');

    res.json({
      success: true,
      message: 'Document signed successfully',
      signatures: document.signatures
    });
  } catch (error) {
    console.error('Sign document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while signing document'
    });
  }
});

// @route   GET /api/documents/:id/download
// @desc    Download document file
// @access  Private
router.get('/:id/download', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      document.uploadedBy.toString() === req.user.id ||
      document.isPublic ||
      document.sharedWith.some(share => share.user.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const filePath = path.join(__dirname, '../../uploads/documents', document.fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(filePath, document.originalName);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while downloading document'
    });
  }
});

// Error handling middleware
router.use(handleUploadError);

module.exports = router;