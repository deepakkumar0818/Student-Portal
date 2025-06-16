import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Search, Filter, Eye, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm();

  // Watch filter values
  const statusFilter = watch('status');
  const dateFilter = watch('date');
  const feeTypeFilter = watch('feeType');

  // Fetch all payments
  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/payment/admin/all');
      setPayments(response.data.data);
      setFilteredPayments(response.data.data);
      calculateStats(response.data.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate payment statistics
  const calculateStats = (paymentList) => {
    const stats = paymentList.reduce((acc, payment) => {
      acc.total += 1;
      acc.totalAmount += payment.amount;
      
      switch (payment.status) {
        case 'successful':
        case 'completed':
          acc.successful += 1;
          break;
        case 'pending':
          acc.pending += 1;
          break;
        case 'failed':
          acc.failed += 1;
          break;
      }
      return acc;
    }, { total: 0, successful: 0, pending: 0, failed: 0, totalAmount: 0 });
    
    setStats(stats);
  };

  // Filter payments based on form values
  const applyFilters = () => {
    let filtered = [...payments];

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    if (feeTypeFilter && feeTypeFilter !== 'all') {
      filtered = filtered.filter(payment => payment.feeType === feeTypeFilter);
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate.toDateString() === filterDate.toDateString();
      });
    }

    setFilteredPayments(filtered);
    calculateStats(filtered);
  };

  // Search payments
  const onSearch = async (data) => {
    if (!data.searchTerm) {
      setFilteredPayments(payments);
      calculateStats(payments);
      return;
    }

    const searchTerm = data.searchTerm.toLowerCase();
    const filtered = payments.filter(payment => 
      payment.student?.rollNumber?.toLowerCase().includes(searchTerm) ||
      payment.student?.fullName?.toLowerCase().includes(searchTerm) ||
      payment.paymentId?.toLowerCase().includes(searchTerm) ||
      payment.razorpayOrderId?.toLowerCase().includes(searchTerm)
    );

    setFilteredPayments(filtered);
    calculateStats(filtered);
  };

  // View payment details
  const viewPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  // Export payments data
  const exportPayments = () => {
    const csvData = filteredPayments.map(payment => ({
      'Payment ID': payment.paymentId,
      'Student Roll No': payment.student?.rollNumber || 'N/A',
      'Student Name': payment.student?.fullName || 'N/A',
      'Amount': payment.amount,
      'Fee Type': payment.feeType,
      'Status': payment.status,
      'Date': new Date(payment.createdAt).toLocaleDateString(),
      'Razorpay Order ID': payment.razorpayOrderId || 'N/A'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Payments data exported successfully');
  };

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'successful':
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Successful'
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="h-4 w-4" />,
          text: 'Pending'
        };
      case 'failed':
        return {
          color: 'bg-red-100 text-red-800',
          icon: <XCircle className="h-4 w-4" />,
          text: 'Failed'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: <Clock className="h-4 w-4" />,
          text: status
        };
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [statusFilter, dateFilter, feeTypeFilter, payments]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payments Management</h1>
            <p className="text-gray-600 mt-2">View and manage all payment transactions</p>
          </div>
          <button 
            onClick={exportPayments}
            className="btn-primary inline-flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-purple-600">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <form onSubmit={handleSubmit(onSearch)} className="flex gap-2">
                <input
                  type="text"
                  {...register('searchTerm')}
                  className="input flex-1"
                  placeholder="Search by roll number, name, or payment ID..."
                />
                <button type="submit" className="btn-primary inline-flex items-center">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </button>
              </form>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select {...register('status')} className="input">
                <option value="all">All Status</option>
                <option value="successful">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              <select {...register('feeType')} className="input">
                <option value="all">All Fee Types</option>
                <option value="tuition">Tuition</option>
                <option value="exam">Exam</option>
                <option value="library">Library</option>
                <option value="lab">Lab</option>
                <option value="hostel">Hostel</option>
                <option value="mess">Mess</option>
                <option value="other">Other</option>
                <option value="full">Full Payment</option>
              </select>

              <input
                type="date"
                {...register('date')}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Payment Transactions</h3>
            <div className="text-sm text-gray-500">
              Showing {filteredPayments.length} of {payments.length} payments
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Found</h3>
              <p className="text-gray-600">No payment transactions match your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount & Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => {
                    const statusDisplay = getStatusDisplay(payment.status);
                    return (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payment.paymentId}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.razorpayOrderId || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payment.student?.fullName || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.student?.rollNumber || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{payment.amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {payment.feeType}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                            {statusDisplay.icon}
                            <span className="ml-1">{statusDisplay.text}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => viewPaymentDetails(payment)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Payment Details</h2>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Payment Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Payment ID:</span> {selectedPayment.paymentId}</div>
                    <div><span className="font-medium">Amount:</span> ₹{selectedPayment.amount}</div>
                    <div><span className="font-medium">Fee Type:</span> <span className="capitalize">{selectedPayment.feeType}</span></div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusDisplay(selectedPayment.status).color}`}>
                        {getStatusDisplay(selectedPayment.status).text}
                      </span>
                    </div>
                    <div><span className="font-medium">Created:</span> {new Date(selectedPayment.createdAt).toLocaleString()}</div>
                    <div><span className="font-medium">Updated:</span> {new Date(selectedPayment.updatedAt).toLocaleString()}</div>
                  </div>
                </div>

                {/* Student Information */}
                {selectedPayment.student && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Name:</span> {selectedPayment.student.fullName}</div>
                      <div><span className="font-medium">Roll No:</span> {selectedPayment.student.rollNumber}</div>
                      <div><span className="font-medium">Email:</span> {selectedPayment.student.email}</div>
                      <div><span className="font-medium">Phone:</span> {selectedPayment.student.phone}</div>
                      <div><span className="font-medium">Course:</span> {selectedPayment.student.course}</div>
                      <div><span className="font-medium">Department:</span> {selectedPayment.student.department}</div>
                    </div>
                  </div>
                )}

                {/* Razorpay Information */}
                {selectedPayment.razorpayOrderId && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Razorpay Information</h3>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div><span className="font-medium">Order ID:</span> {selectedPayment.razorpayOrderId}</div>
                      {selectedPayment.razorpayPaymentId && (
                        <div><span className="font-medium">Payment ID:</span> {selectedPayment.razorpayPaymentId}</div>
                      )}
                      {selectedPayment.razorpaySignature && (
                        <div><span className="font-medium">Signature:</span> {selectedPayment.razorpaySignature}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedPayment.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedPayment.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t">
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments; 