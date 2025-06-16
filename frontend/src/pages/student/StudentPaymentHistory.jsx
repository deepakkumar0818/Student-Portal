import { Link } from 'react-router-dom';
import { History, Calendar, Download } from 'lucide-react';

const StudentPaymentHistory = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600 mt-2">View all your payment transactions</p>
        </div>

        <div className="card">
          <div className="text-center py-12">
            <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
            <p className="text-gray-600">You haven't made any payments yet.</p>
          </div>
        </div>

        <div className="mt-8">
          <Link to="/student/dashboard" className="btn-outline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentPaymentHistory; 