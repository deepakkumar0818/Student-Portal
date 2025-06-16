import { Link } from 'react-router-dom';
import { Users, CreditCard, BarChart3, QrCode, BookOpen, FileText } from 'lucide-react';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage students, payments, exams, and view analytics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Link to="/admin/students" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Students</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </Link>

          <Link to="/admin/payments" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Payments</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </Link>

          <Link to="/admin/exams" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Exams</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </Link>

          <Link to="/admin/documents" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-teal-100 rounded-lg">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Documents</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
            </div>
          </Link>

          <Link to="/admin/generate-qr" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <QrCode className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Generate QR</p>
                <p className="text-sm text-gray-500">Quick Action</p>
              </div>
            </div>
          </Link>

          <Link to="/admin/analytics" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Analytics</p>
                <p className="text-sm text-gray-500">View Reports</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Link to="/admin/students" className="btn-primary text-center">
              Manage Students
            </Link>
            <Link to="/admin/payments" className="btn-outline text-center">
              View Payments
            </Link>
            <Link to="/admin/exams" className="btn-secondary text-center">
              Manage Exams
            </Link>
            <Link to="/admin/documents" className="btn-outline text-center">
              Manage Documents
            </Link>
            <Link to="/admin/generate-qr" className="btn-success text-center">
              Generate QR Code
            </Link>
            <Link to="/admin/analytics" className="btn-outline text-center">
              View Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 