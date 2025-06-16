import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Search, Edit, Eye, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors }
  } = useForm();

  const {
    register: registerSearch,
    handleSubmit: handleSearchSubmit,
    formState: { errors: searchErrors }
  } = useForm();

  // Fetch all students
  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/students');
      setStudents(response.data.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  // Search student by roll number
  const onSearchSubmit = async (data) => {
    try {
      setSearchLoading(true);
      const response = await api.post('/admin/student/search', {
        rollNumber: data.rollNumber
      });
      setSearchResult(response.data.data);
      toast.success('Student found successfully');
    } catch (error) {
      console.error('Error searching student:', error);
      setSearchResult(null);
      toast.error('Student not found');
    } finally {
      setSearchLoading(false);
    }
  };

  // Add new student
  const onAddStudent = async (data) => {
    try {
      setIsLoading(true);
      const studentData = {
        ...data,
        admissionYear: parseInt(data.admissionYear),
        semester: parseInt(data.semester),
        feeStructure: {
          tuitionFee: parseFloat(data.tuitionFee) || 0,
          examFee: parseFloat(data.examFee) || 0,
          libraryFee: parseFloat(data.libraryFee) || 0,
          labFee: parseFloat(data.labFee) || 0,
          hostelFee: parseFloat(data.hostelFee) || 0,
          messFee: parseFloat(data.messFee) || 0,
          otherFee: parseFloat(data.otherFee) || 0
        },
        guardianInfo: {
          name: data.guardianName,
          phone: data.guardianPhone,
          email: data.guardianEmail || '',
          relation: data.guardianRelation || 'Parent'
        },
        address: {
          street: data.street || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          country: data.country || 'India'
        }
      };

      await api.post('/admin/student/create', studentData);
      toast.success('Student created successfully');
      setShowAddModal(false);
      reset();
      fetchStudents();
    } catch (error) {
      console.error('Error creating student:', error);
      toast.error(error.response?.data?.message || 'Failed to create student');
    } finally {
      setIsLoading(false);
    }
  };

  // Open edit modal with student data
  const openEditModal = (student) => {
    setSelectedStudent(student);
    setShowEditModal(true);
    
    // Pre-fill form with student data
    setEditValue('firstName', student.firstName);
    setEditValue('lastName', student.lastName);
    setEditValue('rollNumber', student.rollNumber);
    setEditValue('email', student.email);
    setEditValue('phone', student.phone);
    setEditValue('course', student.course);
    setEditValue('semester', student.semester);
    setEditValue('department', student.department);
    setEditValue('admissionYear', student.admissionYear);
    
    // Fee structure
    setEditValue('tuitionFee', student.feeStructure?.tuitionFee || 0);
    setEditValue('examFee', student.feeStructure?.examFee || 0);
    setEditValue('libraryFee', student.feeStructure?.libraryFee || 0);
    setEditValue('labFee', student.feeStructure?.labFee || 0);
    setEditValue('hostelFee', student.feeStructure?.hostelFee || 0);
    setEditValue('messFee', student.feeStructure?.messFee || 0);
    setEditValue('otherFee', student.feeStructure?.otherFee || 0);
    
    // Guardian info
    setEditValue('guardianName', student.guardianInfo?.name || '');
    setEditValue('guardianPhone', student.guardianInfo?.phone || '');
    setEditValue('guardianEmail', student.guardianInfo?.email || '');
    setEditValue('guardianRelation', student.guardianInfo?.relation || 'Parent');
    
    // Address
    setEditValue('street', student.address?.street || '');
    setEditValue('city', student.address?.city || '');
    setEditValue('state', student.address?.state || '');
    setEditValue('zipCode', student.address?.zipCode || '');
    setEditValue('country', student.address?.country || 'India');
  };

  // Update student
  const onUpdateStudent = async (data) => {
    try {
      setIsLoading(true);
      const studentData = {
        ...data,
        admissionYear: parseInt(data.admissionYear),
        semester: parseInt(data.semester),
        feeStructure: {
          tuitionFee: parseFloat(data.tuitionFee) || 0,
          examFee: parseFloat(data.examFee) || 0,
          libraryFee: parseFloat(data.libraryFee) || 0,
          labFee: parseFloat(data.labFee) || 0,
          hostelFee: parseFloat(data.hostelFee) || 0,
          messFee: parseFloat(data.messFee) || 0,
          otherFee: parseFloat(data.otherFee) || 0
        },
        guardianInfo: {
          name: data.guardianName,
          phone: data.guardianPhone,
          email: data.guardianEmail || '',
          relation: data.guardianRelation || 'Parent'
        },
        address: {
          street: data.street || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          country: data.country || 'India'
        }
      };

      await api.put(`/admin/student/${selectedStudent._id}`, studentData);
      toast.success('Student updated successfully');
      setShowEditModal(false);
      setSelectedStudent(null);
      resetEdit();
      fetchStudents();
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error(error.response?.data?.message || 'Failed to update student');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students Management</h1>
            <p className="text-gray-600 mt-2">Manage all student accounts and information</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </button>
        </div>

        {/* Search Student */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Student</h3>
          <form onSubmit={handleSearchSubmit(onSearchSubmit)} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                {...registerSearch('rollNumber', { required: 'Roll number is required' })}
                className="input"
                placeholder="Enter roll number..."
              />
              {searchErrors.rollNumber && (
                <p className="text-danger-600 text-sm mt-1">{searchErrors.rollNumber.message}</p>
              )}
            </div>
            <button 
              type="submit" 
              disabled={searchLoading}
              className="btn-primary inline-flex items-center"
            >
              {searchLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </button>
          </form>

          {/* Search Result */}
          {searchResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Student Found:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Name:</span> {searchResult.student.fullName}</div>
                <div><span className="font-medium">Roll No:</span> {searchResult.student.rollNumber}</div>
                <div><span className="font-medium">Email:</span> {searchResult.student.email}</div>
                <div><span className="font-medium">Course:</span> {searchResult.student.course}</div>
                <div><span className="font-medium">Semester:</span> {searchResult.student.semester}</div>
                <div><span className="font-medium">Department:</span> {searchResult.student.department}</div>
              </div>
            </div>
          )}
        </div>

        {/* Students List */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">All Students</h3>
            <div className="text-sm text-gray-500">
              Total: {students.length} students
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-600">Start by adding some students to the system.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.rollNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.course}</div>
                        <div className="text-sm text-gray-500">
                          Semester {student.semester} • {student.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.email}</div>
                        <div className="text-sm text-gray-500">{student.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          student.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => openEditModal(student)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link to="/admin/dashboard" className="btn-outline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Student</h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit(onAddStudent)} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        {...register('firstName', { required: 'First name is required' })}
                        className="input"
                      />
                      {errors.firstName && <p className="text-danger-600 text-sm mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        {...register('lastName', { required: 'Last name is required' })}
                        className="input"
                      />
                      {errors.lastName && <p className="text-danger-600 text-sm mt-1">{errors.lastName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number</label>
                      <input
                        type="text"
                        {...register('rollNumber', { required: 'Roll number is required' })}
                        className="input"
                      />
                      {errors.rollNumber && <p className="text-danger-600 text-sm mt-1">{errors.rollNumber.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        {...register('email', { required: 'Email is required' })}
                        className="input"
                      />
                      {errors.email && <p className="text-danger-600 text-sm mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        {...register('phone', { required: 'Phone is required' })}
                        className="input"
                      />
                      {errors.phone && <p className="text-danger-600 text-sm mt-1">{errors.phone.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                        className="input"
                      />
                      {errors.password && <p className="text-danger-600 text-sm mt-1">{errors.password.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                      <input
                        type="text"
                        {...register('course', { required: 'Course is required' })}
                        className="input"
                        placeholder="B.Tech, MBA, etc."
                      />
                      {errors.course && <p className="text-danger-600 text-sm mt-1">{errors.course.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <input
                        type="text"
                        {...register('department', { required: 'Department is required' })}
                        className="input"
                        placeholder="Computer Science, etc."
                      />
                      {errors.department && <p className="text-danger-600 text-sm mt-1">{errors.department.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                      <select {...register('semester', { required: 'Semester is required' })} className="input">
                        <option value="">Select Semester</option>
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>{sem}</option>
                        ))}
                      </select>
                      {errors.semester && <p className="text-danger-600 text-sm mt-1">{errors.semester.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Admission Year</label>
                      <input
                        type="number"
                        {...register('admissionYear', { required: 'Admission year is required' })}
                        className="input"
                        min="2020"
                        max="2030"
                      />
                      {errors.admissionYear && <p className="text-danger-600 text-sm mt-1">{errors.admissionYear.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Fee Structure */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tuition Fee</label>
                      <input
                        type="number"
                        {...register('tuitionFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exam Fee</label>
                      <input
                        type="number"
                        {...register('examFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Library Fee</label>
                      <input
                        type="number"
                        {...register('libraryFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Lab Fee</label>
                      <input
                        type="number"
                        {...register('labFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hostel Fee</label>
                      <input
                        type="number"
                        {...register('hostelFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mess Fee</label>
                      <input
                        type="number"
                        {...register('messFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Other Fee</label>
                      <input
                        type="number"
                        {...register('otherFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Guardian Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Guardian Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Name</label>
                      <input
                        type="text"
                        {...register('guardianName', { required: 'Guardian name is required' })}
                        className="input"
                      />
                      {errors.guardianName && <p className="text-danger-600 text-sm mt-1">{errors.guardianName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Phone</label>
                      <input
                        type="tel"
                        {...register('guardianPhone', { required: 'Guardian phone is required' })}
                        className="input"
                      />
                      {errors.guardianPhone && <p className="text-danger-600 text-sm mt-1">{errors.guardianPhone.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Creating...</span>
                      </div>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Student
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Student - {selectedStudent.rollNumber}</h2>
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedStudent(null);
                    resetEdit();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit(onUpdateStudent)} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        {...registerEdit('firstName', { required: 'First name is required' })}
                        className="input"
                      />
                      {editErrors.firstName && <p className="text-danger-600 text-sm mt-1">{editErrors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        {...registerEdit('lastName', { required: 'Last name is required' })}
                        className="input"
                      />
                      {editErrors.lastName && <p className="text-danger-600 text-sm mt-1">{editErrors.lastName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number</label>
                      <input
                        type="text"
                        {...registerEdit('rollNumber', { required: 'Roll number is required' })}
                        className="input"
                        disabled
                      />
                      {editErrors.rollNumber && <p className="text-danger-600 text-sm mt-1">{editErrors.rollNumber.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        {...registerEdit('email', { required: 'Email is required' })}
                        className="input"
                      />
                      {editErrors.email && <p className="text-danger-600 text-sm mt-1">{editErrors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        {...registerEdit('phone', { required: 'Phone is required' })}
                        className="input"
                      />
                      {editErrors.phone && <p className="text-danger-600 text-sm mt-1">{editErrors.phone.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password (Leave blank to keep current)</label>
                      <input
                        type="password"
                        {...registerEdit('password', { minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                        className="input"
                        placeholder="Enter new password or leave blank"
                      />
                      {editErrors.password && <p className="text-danger-600 text-sm mt-1">{editErrors.password.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                      <input
                        type="text"
                        {...registerEdit('course', { required: 'Course is required' })}
                        className="input"
                        placeholder="B.Tech, MBA, etc."
                      />
                      {editErrors.course && <p className="text-danger-600 text-sm mt-1">{editErrors.course.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <input
                        type="text"
                        {...registerEdit('department', { required: 'Department is required' })}
                        className="input"
                        placeholder="Computer Science, etc."
                      />
                      {editErrors.department && <p className="text-danger-600 text-sm mt-1">{editErrors.department.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                      <select {...registerEdit('semester', { required: 'Semester is required' })} className="input">
                        <option value="">Select Semester</option>
                        {[1,2,3,4,5,6,7,8].map(sem => (
                          <option key={sem} value={sem}>{sem}</option>
                        ))}
                      </select>
                      {editErrors.semester && <p className="text-danger-600 text-sm mt-1">{editErrors.semester.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Admission Year</label>
                      <input
                        type="number"
                        {...registerEdit('admissionYear', { required: 'Admission year is required' })}
                        className="input"
                        min="2020"
                        max="2030"
                      />
                      {editErrors.admissionYear && <p className="text-danger-600 text-sm mt-1">{editErrors.admissionYear.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Fee Structure */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tuition Fee</label>
                      <input
                        type="number"
                        {...registerEdit('tuitionFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exam Fee</label>
                      <input
                        type="number"
                        {...registerEdit('examFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Library Fee</label>
                      <input
                        type="number"
                        {...registerEdit('libraryFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Lab Fee</label>
                      <input
                        type="number"
                        {...registerEdit('labFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hostel Fee</label>
                      <input
                        type="number"
                        {...registerEdit('hostelFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mess Fee</label>
                      <input
                        type="number"
                        {...registerEdit('messFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Other Fee</label>
                      <input
                        type="number"
                        {...registerEdit('otherFee')}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Guardian Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Guardian Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Name</label>
                      <input
                        type="text"
                        {...registerEdit('guardianName', { required: 'Guardian name is required' })}
                        className="input"
                      />
                      {editErrors.guardianName && <p className="text-danger-600 text-sm mt-1">{editErrors.guardianName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Phone</label>
                      <input
                        type="tel"
                        {...registerEdit('guardianPhone', { required: 'Guardian phone is required' })}
                        className="input"
                      />
                      {editErrors.guardianPhone && <p className="text-danger-600 text-sm mt-1">{editErrors.guardianPhone.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Email</label>
                      <input
                        type="email"
                        {...registerEdit('guardianEmail')}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Relation</label>
                      <select {...registerEdit('guardianRelation')} className="input">
                        <option value="Parent">Parent</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Relative">Relative</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                      <input
                        type="text"
                        {...registerEdit('street')}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        {...registerEdit('city')}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        {...registerEdit('state')}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                      <input
                        type="text"
                        {...registerEdit('zipCode')}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        {...registerEdit('country')}
                        className="input"
                        defaultValue="India"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedStudent(null);
                      resetEdit();
                    }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Updating...</span>
                      </div>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Update Student
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents; 