import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

// Store
import useAuthStore from './store/authStore';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import LandingPage from './pages/LandingPage';
import StudentLogin from './pages/auth/StudentLogin';
import AdminLogin from './pages/auth/AdminLogin';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentFeeStatus from './pages/student/StudentFeeStatus';
import StudentPaymentHistory from './pages/student/StudentPaymentHistory';
import StudentExams from './pages/student/StudentExams';
import StudentDocuments from './pages/student/StudentDocuments';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminPayments from './pages/admin/AdminPayments';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminExams from './pages/admin/AdminExams';
import AdminDocuments from './pages/admin/AdminDocuments';
import QRGenerator from './pages/admin/QRGenerator';
import AdminExamCreate from './pages/admin/AdminExamCreate';
import StudentExamTake from './pages/student/StudentExamTake';
import NotFound from './pages/NotFound';

function App() {
  const { initializeAuth, isLoading } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<StudentLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Student Protected Routes */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute requiredRole="student">
                <Routes>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<StudentDashboard />} />
                  <Route path="profile" element={<StudentProfile />} />
                  <Route path="fee-status" element={<StudentFeeStatus />} />
                  <Route path="payment-history" element={<StudentPaymentHistory />} />
                  <Route path="exams" element={<StudentExams />} />
                  <Route path="documents" element={<StudentDocuments />} />
                  <Route path="exams/:examId/take" element={<StudentExamTake />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRole="admin">
                <Routes>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="students" element={<AdminStudents />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="exams" element={<AdminExams />} />
                  <Route path="documents" element={<AdminDocuments />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="generate-qr" element={<QRGenerator />} />
                  <Route path="exams/create" element={<AdminExamCreate />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
