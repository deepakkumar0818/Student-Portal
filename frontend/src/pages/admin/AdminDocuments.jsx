import { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Award,
  GraduationCap,
  User,
  Calendar
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [filters, setFilters] = useState({
    documentType: '',
    isVerified: '',
    searchTerm: ''
  });
  const [uploadForm, setUploadForm] = useState({
    studentId: '',
    documentType: '',
    title: '',
    description: '',
    academicYear: '',
    semester: '',
    subjects: [],
    totalMarks: '',
    obtainedMarks: '',
    percentage: '',
    cgpa: '',
    result: '',
    file: null
  });

  const institutionDocumentTypes = {
    degree_certificate: { label: 'Degree Certificate', icon: Award },
    provisional_certificate: { label: 'Provisional Certificate', icon: Award },
    semester_marksheet: { label: 'Semester Marksheet', icon: GraduationCap },
    transcript: { label: 'Official Transcript', icon: GraduationCap },
    character_certificate_college: { label: 'Character Certificate', icon: FileText },
    migration_certificate_college: { label: 'Migration Certificate', icon: FileText }
  };

  const resultOptions = ['Pass', 'Fail', 'Distinction', 'First Class', 'Second Class', 'Third Class'];

  useEffect(() => {
    fetchDocuments();
    fetchStudents();
  }, [filters]);

  const fetchDocuments = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.documentType) queryParams.append('documentType', filters.documentType);
      if (filters.isVerified !== '') queryParams.append('isVerified', filters.isVerified);
      
      const response = await fetch(`/api/documents/admin/all?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        let filteredDocs = data.documents;
        
        // Client-side search filtering
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          filteredDocs = filteredDocs.filter(doc => 
            doc.title.toLowerCase().includes(searchLower) ||
            doc.studentId?.firstName?.toLowerCase().includes(searchLower) ||
            doc.studentId?.lastName?.toLowerCase().includes(searchLower) ||
            doc.rollNumber.toLowerCase().includes(searchLower)
          );
        }
        
        setDocuments(filteredDocs);
      } else {
        console.error('Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/admin/students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.documentType || !uploadForm.title || !uploadForm.studentId) {
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
      
      if (uploadForm.academicYear) formData.append('academicYear', uploadForm.academicYear);
      if (uploadForm.semester) formData.append('semester', uploadForm.semester);
      if (uploadForm.subjects.length > 0) formData.append('subjects', JSON.stringify(uploadForm.subjects));
      if (uploadForm.totalMarks) formData.append('totalMarks', uploadForm.totalMarks);
      if (uploadForm.obtainedMarks) formData.append('obtainedMarks', uploadForm.obtainedMarks);
      if (uploadForm.percentage) formData.append('percentage', uploadForm.percentage);
      if (uploadForm.cgpa) formData.append('cgpa', uploadForm.cgpa);
      if (uploadForm.result) formData.append('result', uploadForm.result);

      const response = await fetch(`/api/documents/admin/upload/${uploadForm.studentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        alert('Document uploaded successfully!');
        setShowUploadModal(false);
        resetUploadForm();
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

  const resetUploadForm = () => {
    setUploadForm({
      studentId: '',
      documentType: '',
      title: '',
      description: '',
      academicYear: '',
      semester: '',
      subjects: [],
      totalMarks: '',
      obtainedMarks: '',
      percentage: '',
      cgpa: '',
      result: '',
      file: null
    });
  };

  const handleVerifyDocument = async (documentId, isVerified) => {
    try {
      const response = await fetch(`/api/documents/admin/verify/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isVerified })
      });

      if (response.ok) {
        alert(`Document ${isVerified ? 'verified' : 'unverified'} successfully`);
        fetchDocuments();
      } else {
        alert('Failed to update verification status');
      }
    } catch (error) {
      console.error('Error updating verification:', error);
      alert('Failed to update verification status');
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isMarksheetType = (docType) => {
    return ['semester_marksheet', 'transcript'].includes(docType);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading documents..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
              <p className="text-gray-600 mt-1">Manage student documents, degrees, and results</p>
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by name, roll number, title..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="form-input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <select
                value={filters.documentType}
                onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                className="form-input"
              >
                <option value="">All Types</option>
                {Object.entries(institutionDocumentTypes).map(([key, type]) => (
                  <option key={key} value={key}>{type.label}</option>
                ))}
                <option value="class12_marksheet">12th Marksheet</option>
                <option value="class10_marksheet">10th Marksheet</option>
                <option value="other_document">Other Documents</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
              <select
                value={filters.isVerified}
                onChange={(e) => setFilters({ ...filters, isVerified: e.target.value })}
                className="form-input"
              >
                <option value="">All Status</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => {
                  const docType = institutionDocumentTypes[doc.documentType] || { label: doc.documentType, icon: FileText };
                  const IconComponent = docType.icon;

                  return (
                    <tr key={doc._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {doc.studentId ? `${doc.studentId.firstName} ${doc.studentId.lastName}` : 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">{doc.rollNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <IconComponent className="h-5 w-5 text-primary-600 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                            {doc.description && (
                              <div className="text-sm text-gray-500">{doc.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {docType.label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {doc.isVerified ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="h-5 w-5 text-yellow-500 mr-1" />
                          )}
                          <span className={`text-sm ${doc.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                            {doc.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleDownload(doc._id, doc.fileName)}
                            className="text-primary-600 hover:text-primary-900 p-1"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {!doc.isVerified && doc.uploadedBy === 'student' && (
                            <button
                              onClick={() => handleVerifyDocument(doc._id, true)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Verify"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {doc.isVerified && (
                            <button
                              onClick={() => handleVerifyDocument(doc._id, false)}
                              className="text-yellow-600 hover:text-yellow-900 p-1"
                              title="Unverify"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {documents.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-600">No documents match your current filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Document</h2>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student *
                    </label>
                    <select
                      value={uploadForm.studentId}
                      onChange={(e) => setUploadForm({ ...uploadForm, studentId: e.target.value })}
                      className="form-input"
                      required
                    >
                      <option value="">Select student</option>
                      {students.map((student) => (
                        <option key={student._id} value={student._id}>
                          {student.firstName} {student.lastName} ({student.rollNumber})
                        </option>
                      ))}
                    </select>
                  </div>

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
                      {Object.entries(institutionDocumentTypes).map(([key, type]) => (
                        <option key={key} value={key}>{type.label}</option>
                      ))}
                    </select>
                  </div>
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
                    rows="2"
                    placeholder="Optional description"
                  />
                </div>

                {/* Additional fields for marksheets/transcripts */}
                {isMarksheetType(uploadForm.documentType) && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Academic Year
                        </label>
                        <input
                          type="text"
                          value={uploadForm.academicYear}
                          onChange={(e) => setUploadForm({ ...uploadForm, academicYear: e.target.value })}
                          className="form-input"
                          placeholder="2023-24"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Semester
                        </label>
                        <select
                          value={uploadForm.semester}
                          onChange={(e) => setUploadForm({ ...uploadForm, semester: e.target.value })}
                          className="form-input"
                        >
                          <option value="">Select semester</option>
                          {[1,2,3,4,5,6,7,8].map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Result
                        </label>
                        <select
                          value={uploadForm.result}
                          onChange={(e) => setUploadForm({ ...uploadForm, result: e.target.value })}
                          className="form-input"
                        >
                          <option value="">Select result</option>
                          {resultOptions.map(result => (
                            <option key={result} value={result}>{result}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Marks
                        </label>
                        <input
                          type="number"
                          value={uploadForm.totalMarks}
                          onChange={(e) => setUploadForm({ ...uploadForm, totalMarks: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Obtained Marks
                        </label>
                        <input
                          type="number"
                          value={uploadForm.obtainedMarks}
                          onChange={(e) => setUploadForm({ ...uploadForm, obtainedMarks: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Percentage
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={uploadForm.percentage}
                          onChange={(e) => setUploadForm({ ...uploadForm, percentage: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CGPA
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={uploadForm.cgpa}
                          onChange={(e) => setUploadForm({ ...uploadForm, cgpa: e.target.value })}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </>
                )}

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
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
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

export default AdminDocuments; 