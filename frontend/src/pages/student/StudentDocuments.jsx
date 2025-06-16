import { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye,
  Award,
  GraduationCap,
  FileImage,
  FileClock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';

const StudentDocuments = () => {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadForm, setUploadForm] = useState({
    documentType: '',
    title: '',
    description: '',
    file: null
  });

  const documentCategories = {
    all: 'All Documents',
    personal: 'Personal Documents',
    academic: 'Academic Documents',
    certificates: 'Certificates',
    results: 'Results & Degrees'
  };

  const documentTypes = {
    // Personal Documents
    class12_marksheet: { label: '12th Class Marksheet', category: 'personal', icon: FileText },
    class10_marksheet: { label: '10th Class Marksheet', category: 'personal', icon: FileText },
    birth_certificate: { label: 'Birth Certificate', category: 'personal', icon: FileText },
    aadhar_card: { label: 'Aadhar Card', category: 'personal', icon: FileText },
    caste_certificate: { label: 'Caste Certificate', category: 'personal', icon: FileText },
    income_certificate: { label: 'Income Certificate', category: 'personal', icon: FileText },
    migration_certificate: { label: 'Migration Certificate', category: 'personal', icon: FileText },
    character_certificate: { label: 'Character Certificate', category: 'personal', icon: FileText },
    passport_photo: { label: 'Passport Photo', category: 'personal', icon: FileImage },
    signature: { label: 'Signature', category: 'personal', icon: FileImage },
    other_document: { label: 'Other Document', category: 'personal', icon: FileText },
    
    // Academic Documents (issued by institution)
    degree_certificate: { label: 'Degree Certificate', category: 'results', icon: Award },
    provisional_certificate: { label: 'Provisional Certificate', category: 'results', icon: Award },
    semester_marksheet: { label: 'Semester Marksheet', category: 'results', icon: GraduationCap },
    transcript: { label: 'Official Transcript', category: 'results', icon: GraduationCap },
    character_certificate_college: { label: 'Character Certificate (College)', category: 'certificates', icon: FileText },
    migration_certificate_college: { label: 'Migration Certificate (College)', category: 'certificates', icon: FileText }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents/my-documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.error('Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.documentType || !uploadForm.title) {
      alert('Please fill all required fields');
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', uploadForm.file);
      formData.append('documentType', uploadForm.documentType);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        alert('Document uploaded successfully!');
        setShowUploadModal(false);
        setUploadForm({ documentType: '', title: '', description: '', file: null });
        fetchDocuments();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const response = await fetch(`/api/documents/download/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleDelete = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('Document deleted successfully');
        fetchDocuments();
      } else {
        alert('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const getFilteredDocuments = () => {
    if (selectedCategory === 'all') return documents;
    
    return documents.filter(doc => {
      const docType = documentTypes[doc.documentType];
      return docType && docType.category === selectedCategory;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVerificationStatus = (doc) => {
    if (doc.uploadedBy === 'admin') {
      return { status: 'verified', icon: CheckCircle, color: 'text-green-600', text: 'Verified by Admin' };
    } else if (doc.isVerified) {
      return { status: 'verified', icon: CheckCircle, color: 'text-green-600', text: 'Verified' };
    } else {
      return { status: 'pending', icon: FileClock, color: 'text-yellow-600', text: 'Pending Verification' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading documents..." />
      </div>
    );
  }

  const filteredDocuments = getFilteredDocuments();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Document Portal</h1>
              <p className="text-gray-600 mt-1">Manage your academic and personal documents</p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary inline-flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {Object.entries(documentCategories).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => {
              const docType = documentTypes[doc.documentType] || { label: doc.documentType, icon: FileText };
              const IconComponent = docType.icon;
              const verification = getVerificationStatus(doc);
              const VerificationIcon = verification.icon;

              return (
                <div key={doc._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <IconComponent className="h-8 w-8 text-primary-600 mr-3" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                        <p className="text-sm text-gray-600">{docType.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <VerificationIcon className={`h-5 w-5 ${verification.color}`} />
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-sm text-gray-600 mb-4">{doc.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">File Size:</span>
                      <span className="text-gray-900">{formatFileSize(doc.fileSize)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Uploaded:</span>
                      <span className="text-gray-900">{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className={`${verification.color} font-medium`}>{verification.text}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownload(doc._id, doc.fileName)}
                      className="flex-1 btn-primary text-sm py-2"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    {doc.uploadedBy === 'student' && (
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="btn-outline text-red-600 hover:bg-red-50 text-sm py-2 px-3"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-600 mb-4">
                {selectedCategory === 'all' 
                  ? "You haven't uploaded any documents yet."
                  : `No documents found in the ${documentCategories[selectedCategory].toLowerCase()} category.`
                }
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary inline-flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Document
              </button>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Document</h2>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type *
                  </label>
                  <select
                    value={uploadForm.documentType}
                    onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                    className="form-input"
                    required
                  >
                    <option value="">Select document type</option>
                    {Object.entries(documentTypes)
                      .filter(([key, type]) => !key.includes('college') && !['degree_certificate', 'provisional_certificate', 'semester_marksheet', 'transcript'].includes(key))
                      .map(([key, type]) => (
                        <option key={key} value={key}>{type.label}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="form-input"
                    placeholder="Enter document title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="form-input"
                    rows="3"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File *
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                    className="form-input"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 btn-outline"
                    disabled={uploadLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDocuments; 