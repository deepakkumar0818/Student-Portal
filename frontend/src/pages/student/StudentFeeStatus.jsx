import { Link } from 'react-router-dom';
import { DollarSign, AlertCircle, CheckCircle, RefreshCw, Calendar, History } from 'lucide-react';
import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';

const StudentFeeStatus = () => {
  const { user, refreshUser } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('current');

  // Refresh user data when component mounts
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    setIsRefreshing(false);
  };

  // Get fee structure for selected semester
  const getFeeStructure = () => {
    if (selectedSemester === 'current' || !selectedSemester) {
      return user?.feeStructure;
    }
    
    const semesterNum = parseInt(selectedSemester);
    const semesterFee = user?.semesterFees?.find(sf => sf.semester === semesterNum);
    return semesterFee?.feeStructure;
  };

  // Get payment status
  const getPaymentStatus = (feeStructure) => {
    if (!feeStructure) return 'unknown';
    
    const { paidAmount = 0, totalAmount = 0 } = feeStructure;
    if (paidAmount >= totalAmount && totalAmount > 0) return 'completed';
    if (paidAmount > 0) return 'partial';
    return 'pending';
  };

  const currentFeeStructure = getFeeStructure();
  const paymentStatus = getPaymentStatus(currentFeeStructure);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fee Status</h1>
            <p className="text-gray-600 mt-2">View your current and previous semester fee payment status</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-outline flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Semester Selection */}
        <div className="card mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Select Semester</h3>
          </div>
          
          {/* Dropdown version */}
          <div className="mb-4">
            <select 
              value={selectedSemester} 
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="input w-full max-w-xs"
            >
              <option value="current">Current Semester ({user?.semester})</option>
              {[...Array(8)].map((_, index) => {
                const semesterNum = index + 1;
                const semesterFee = user?.semesterFees?.find(sf => sf.semester === semesterNum);
                const isCurrent = semesterNum === user?.semester;
                
                if (isCurrent) return null; // Skip current semester as it's already shown above
                
                return (
                  <option key={semesterNum} value={semesterNum.toString()}>
                    Semester {semesterNum}
                    {semesterFee ? ` - ${semesterFee.status}` : ' - No Data'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Button version (alternative) */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSemester('current')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                selectedSemester === 'current'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Current Semester ({user?.semester})
            </button>
            {/* Show all semesters 1-8 */}
            {[...Array(8)].map((_, index) => {
              const semesterNum = index + 1;
              const semesterFee = user?.semesterFees?.find(sf => sf.semester === semesterNum);
              const isCurrent = semesterNum === user?.semester;
              
              if (isCurrent) return null; // Skip current semester
              
              return (
                <button
                  key={semesterNum}
                  onClick={() => setSelectedSemester(semesterNum.toString())}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    selectedSemester === semesterNum.toString()
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semester {semesterNum}
                  {semesterFee && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      semesterFee.status === 'completed' ? 'bg-green-200 text-green-800' :
                      semesterFee.status === 'partial' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {semesterFee.status}
                    </span>
                  )}
                  {!semesterFee && (
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                      No Data
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fee Status Display */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedSemester === 'current' ? `Current Semester (${user?.semester})` : `Semester ${selectedSemester}`} Fee Status
            </h3>
            <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
              paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
              paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
              paymentStatus === 'pending' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {paymentStatus === 'completed' ? 'Fully Paid' :
               paymentStatus === 'partial' ? 'Partially Paid' :
               paymentStatus === 'pending' ? 'Payment Pending' : 'Unknown Status'}
            </span>
          </div>
          
          {currentFeeStructure ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-600">₹{currentFeeStructure.totalAmount || 0}</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Paid Amount</p>
                  <p className="text-2xl font-bold text-green-600">₹{currentFeeStructure.paidAmount || 0}</p>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Pending Amount</p>
                  <p className="text-2xl font-bold text-orange-600">₹{currentFeeStructure.pendingAmount || 0}</p>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Fee Breakdown</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentFeeStructure.tuitionFee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Tuition Fee</span>
                      <span className="font-semibold text-gray-900">₹{currentFeeStructure.tuitionFee}</span>
                    </div>
                  )}
                  {currentFeeStructure.examFee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Exam Fee</span>
                      <span className="font-semibold text-gray-900">₹{currentFeeStructure.examFee}</span>
                    </div>
                  )}
                  {currentFeeStructure.libraryFee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Library Fee</span>
                      <span className="font-semibold text-gray-900">₹{currentFeeStructure.libraryFee}</span>
                    </div>
                  )}
                  {currentFeeStructure.labFee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Lab Fee</span>
                      <span className="font-semibold text-gray-900">₹{currentFeeStructure.labFee}</span>
                    </div>
                  )}
                  {currentFeeStructure.hostelFee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Hostel Fee</span>
                      <span className="font-semibold text-gray-900">₹{currentFeeStructure.hostelFee}</span>
                    </div>
                  )}
                  {currentFeeStructure.messFee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Mess Fee</span>
                      <span className="font-semibold text-gray-900">₹{currentFeeStructure.messFee}</span>
                    </div>
                  )}
                  {currentFeeStructure.otherFee > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700">Other Fee</span>
                      <span className="font-semibold text-gray-900">₹{currentFeeStructure.otherFee}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment History for Selected Semester */}
              {selectedSemester !== 'current' && user?.semesterFees && (
                (() => {
                  const semFee = user.semesterFees.find(sf => sf.semester === parseInt(selectedSemester));
                  return semFee?.payments && semFee.payments.length > 0 ? (
                    <div className="mt-6 bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <History className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">Payment History - Semester {selectedSemester}</h4>
                      </div>
                      <div className="space-y-3">
                        {semFee.payments.map((payment, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-gray-900">₹{payment.amount}</p>
                                <p className="text-sm text-gray-600">{payment.feeType} fee</p>
                                {payment.transactionId && (
                                  <p className="text-xs text-gray-500">TXN: {payment.transactionId}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">
                                  {new Date(payment.paidAt).toLocaleDateString()}
                                </p>
                                <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                  Completed
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No fee information available for this semester.</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">
              Contact admin to generate QR code for payment
            </p>
            <Link to="/student/payment-history" className="btn-primary">
              View Complete Payment History
            </Link>
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

export default StudentFeeStatus; 