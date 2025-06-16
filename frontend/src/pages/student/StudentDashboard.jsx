import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  CreditCard, 
  History, 
  Bell, 
  LogOut,
  GraduationCap,
  DollarSign,
  Calendar,
  AlertCircle,
  BookOpen,
  FileText
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';

const StudentDashboard = () => {
  const { user, logout, refreshUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  // Refresh user data when component mounts to get latest fee information
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Student Portal</h1>
                <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="btn-outline inline-flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-white rounded-lg shadow-sm p-4">
              <ul className="space-y-2">
                <li>
                  <Link to="/student/dashboard" className="sidebar-link-active">
                    <GraduationCap className="h-4 w-4 mr-3" />
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/student/profile" className="sidebar-link-inactive">
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Link>
                </li>
                <li>
                  <Link to="/student/fee-status" className="sidebar-link-inactive">
                    <CreditCard className="h-4 w-4 mr-3" />
                    Fee Status
                  </Link>
                </li>
                <li>
                  <Link to="/student/exams" className="sidebar-link-inactive">
                    <BookOpen className="h-4 w-4 mr-3" />
                    Exam Portal
                  </Link>
                </li>
                <li>
                  <Link to="/student/documents" className="sidebar-link-inactive">
                    <FileText className="h-4 w-4 mr-3" />
                    Documents
                  </Link>
                </li>
                <li>
                  <Link to="/student/payment-history" className="sidebar-link-inactive">
                    <History className="h-4 w-4 mr-3" />
                    Payment History
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Fees</p>
                    <p className="text-2xl font-bold text-gray-900">₹{user?.feeStructure?.totalAmount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-success-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-success-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                    <p className="text-2xl font-bold text-success-600">₹{user?.feeStructure?.paidAmount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-warning-100 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-warning-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                    <p className="text-2xl font-bold text-warning-600">₹{user?.feeStructure?.pendingAmount || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/student/fee-status" className="btn-primary text-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Fee Status
                </Link>
                <Link to="/student/exams" className="btn-secondary text-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Exam Portal
                </Link>
                <Link to="/student/documents" className="btn-outline text-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </Link>
                <Link to="/student/payment-history" className="btn-outline text-center">
                  <History className="h-4 w-4 mr-2" />
                  Payment History
                </Link>
              </div>
            </div>

            {/* Student Information */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Roll Number</p>
                  <p className="text-lg font-semibold text-gray-900">{user?.rollNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Course</p>
                  <p className="text-lg font-semibold text-gray-900">{user?.course}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Department</p>
                  <p className="text-lg font-semibold text-gray-900">{user?.department}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Semester</p>
                  <p className="text-lg font-semibold text-gray-900">{user?.semester}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 