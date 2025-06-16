import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Search, CreditCard, Download, Copy, CheckCircle, Clock, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const QRGenerator = () => {
  const [student, setStudent] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { refreshUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm();

  const {
    register: registerQR,
    handleSubmit: handleQRSubmit,
    formState: { errors: qrErrors },
    setValue: setValueQR,
    reset: resetQR,
    watch
  } = useForm();

  // Watch amount changes for validation
  const watchedAmount = watch('amount');

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Search student by roll number
  const onSearchStudent = async (data) => {
    try {
      setIsLoading(true);
      const response = await api.post('/admin/student/search', {
        rollNumber: data.rollNumber
      });
      setStudent(response.data.data.student);
      setQrData(null); // Reset QR data when searching new student
      toast.success('Student found successfully');
    } catch (error) {
      console.error('Error searching student:', error);
      setStudent(null);
      setQrData(null);
      toast.error('Student not found');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate QR Code for payment
  const onGenerateQR = async (data) => {
    if (!student) {
      toast.error('Please search and select a student first');
      return;
    }

    try {
      setGeneratingQR(true);
      const response = await api.post('/payment/generate-qr', {
        studentId: student._id,
        amount: parseFloat(data.amount),
        feeType: data.feeType,
        semester: data.semester ? parseInt(data.semester) : undefined,
        description: data.description || `${data.feeType} payment for ${student.fullName}`
      });
      
      setQrData(response.data.data);
      
      // Show warnings if any
      if (response.data.data.warnings && response.data.data.warnings.length > 0) {
        response.data.data.warnings.forEach(warning => {
          toast.warning(warning);
        });
      }
      
      toast.success('QR Code generated successfully');
    } catch (error) {
      console.error('Error generating QR:', error);
      const errorMessage = error.response?.data?.message || 'Failed to generate QR code';
      
      // Handle specific duplicate payment errors
      if (error.response?.status === 400) {
        if (errorMessage.includes('already paid')) {
          toast.error(`⚠️ ${errorMessage}`);
        } else if (errorMessage.includes('pending payment')) {
          toast.error(`⏳ ${errorMessage}`);
        } else if (errorMessage.includes('exceeds')) {
          toast.error(`💰 ${errorMessage}`);
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setGeneratingQR(false);
    }
  };

  // Process payment through Razorpay
  const processRazorpayPayment = async () => {
    if (!qrData || !window.Razorpay) {
      toast.error('Payment system not loaded');
      return;
    }

    try {
      setProcessingPayment(true);

      const options = {
        key: 'rzp_test_okHRLcPbVKZGBU', // Use the Razorpay key from config
        amount: qrData.amount * 100, // Amount in paise
        currency: 'INR',
        name: 'Student Portal',
        description: `${qrData.feeType} payment for ${student.fullName}`,
        order_id: qrData.razorpayOrderId,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResponse.data.success) {
              // Update the QR data to show completed status
              setQrData(prev => ({
                ...prev,
                status: 'completed',
                razorpayPaymentId: response.razorpay_payment_id
              }));
              
              // Refresh user data if the current logged-in user is the same student
              try {
                await refreshUser();
              } catch (error) {
                console.log('User refresh not needed or failed:', error.message);
              }
              
              toast.success('Payment completed successfully!');
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: student.fullName,
          email: student.email,
          contact: student.phone
        },
        notes: {
          student_id: student._id,
          roll_number: student.rollNumber,
          fee_type: qrData.feeType
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setProcessingPayment(false);
            toast.info('Payment cancelled');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Error processing payment');
      setProcessingPayment(false);
    }
  };

  // Copy QR Code URL
  const copyQRUrl = () => {
    if (qrData?.qrCodeImage) {
      navigator.clipboard.writeText(qrData.qrCodeImage);
      toast.success('QR Code URL copied to clipboard');
    }
  };

  // Download QR Code
  const downloadQR = () => {
    if (qrData?.qrCodeImage) {
      const link = document.createElement('a');
      link.href = qrData.qrCodeImage;
      link.download = `QR_${student?.rollNumber}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR Code downloaded');
    }
  };

  // Test payment update for debugging
  const testPaymentUpdate = async () => {
    if (!student) {
      toast.error('Please select a student first');
      return;
    }

    try {
      const amount = prompt('Enter test payment amount:');
      if (!amount || isNaN(amount)) {
        toast.error('Invalid amount');
        return;
      }

      const response = await api.post('/payment/test-update', {
        studentId: student._id,
        amount: parseFloat(amount),
        feeType: 'test'
      });

      if (response.data.success) {
        toast.success('Test payment update successful!');
        
        // Update the student data in state
        setStudent(prev => ({
          ...prev,
          feeStructure: response.data.data.feeStructure
        }));
        
        // Refresh user data if needed
        try {
          await refreshUser();
        } catch (error) {
          console.log('User refresh not needed:', error.message);
        }
        
        console.log('Test Payment Result:', response.data.data);
      }
    } catch (error) {
      console.error('Test payment error:', error);
      toast.error(error.response?.data?.message || 'Test payment failed');
    }
  };

  // Calculate total fee based on student's fee structure
  const calculateTotalFee = () => {
    if (!student?.feeStructure) return 0;
    const { tuitionFee, examFee, libraryFee, labFee, hostelFee, messFee, otherFee } = student.feeStructure;
    return (tuitionFee || 0) + (examFee || 0) + (libraryFee || 0) + (labFee || 0) + 
           (hostelFee || 0) + (messFee || 0) + (otherFee || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">QR Code Generator</h1>
          <p className="text-gray-600 mt-2">Generate QR codes for student fee payments with Razorpay integration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Student Search & QR Generation */}
          <div className="space-y-6">
            {/* Search Student */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Student</h3>
              <form onSubmit={handleSubmit(onSearchStudent)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number</label>
                  <input
                    type="text"
                    {...register('rollNumber', { required: 'Roll number is required' })}
                    className="input"
                    placeholder="Enter student roll number..."
                  />
                  {errors.rollNumber && (
                    <p className="text-danger-600 text-sm mt-1">{errors.rollNumber.message}</p>
                  )}
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="btn-primary w-full inline-flex items-center justify-center"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4 mr-2" />}
                  Search Student
                </button>
              </form>
            </div>

            {/* Student Details */}
            {student && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={testPaymentUpdate}
                      className="btn-outline text-sm flex items-center gap-1"
                      title="Test payment update for debugging"
                    >
                      🧪 Test Payment
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Name:</span> {student.fullName}</div>
                  <div><span className="font-medium">Roll No:</span> {student.rollNumber}</div>
                  <div><span className="font-medium">Email:</span> {student.email}</div>
                  <div><span className="font-medium">Phone:</span> {student.phone}</div>
                  <div><span className="font-medium">Course:</span> {student.course}</div>
                  <div><span className="font-medium">Current Semester:</span> {student.semester}</div>
                  <div><span className="font-medium">Department:</span> {student.department}</div>
                </div>
                
                {/* Current Semester Fee Status */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Current Semester ({student.semester}) Fee Status</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="font-medium text-blue-600">Total:</span> ₹{student.feeStructure?.totalAmount || 0}</div>
                    <div><span className="font-medium text-green-600">Paid:</span> ₹{student.feeStructure?.paidAmount || 0}</div>
                    <div><span className="font-medium text-red-600">Pending:</span> ₹{student.feeStructure?.pendingAmount || 0}</div>
                    <div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        (student.feeStructure?.paidAmount || 0) >= (student.feeStructure?.totalAmount || 0) 
                          ? 'bg-green-100 text-green-800' 
                          : (student.feeStructure?.paidAmount || 0) > 0 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {(student.feeStructure?.paidAmount || 0) >= (student.feeStructure?.totalAmount || 0) ? 'Completed' :
                         (student.feeStructure?.paidAmount || 0) > 0 ? 'Partial' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fee Breakdown */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">Fee Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {student.feeStructure?.tuitionFee > 0 && (
                      <div className="flex justify-between">
                        <span>Tuition Fee:</span>
                        <span className="font-medium">₹{student.feeStructure.tuitionFee}</span>
                      </div>
                    )}
                    {student.feeStructure?.examFee > 0 && (
                      <div className="flex justify-between">
                        <span>Exam Fee:</span>
                        <span className="font-medium">₹{student.feeStructure.examFee}</span>
                      </div>
                    )}
                    {student.feeStructure?.libraryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Library Fee:</span>
                        <span className="font-medium">₹{student.feeStructure.libraryFee}</span>
                      </div>
                    )}
                    {student.feeStructure?.labFee > 0 && (
                      <div className="flex justify-between">
                        <span>Lab Fee:</span>
                        <span className="font-medium">₹{student.feeStructure.labFee}</span>
                      </div>
                    )}
                    {student.feeStructure?.hostelFee > 0 && (
                      <div className="flex justify-between">
                        <span>Hostel Fee:</span>
                        <span className="font-medium">₹{student.feeStructure.hostelFee}</span>
                      </div>
                    )}
                    {student.feeStructure?.messFee > 0 && (
                      <div className="flex justify-between">
                        <span>Mess Fee:</span>
                        <span className="font-medium">₹{student.feeStructure.messFee}</span>
                      </div>
                    )}
                    {student.feeStructure?.otherFee > 0 && (
                      <div className="flex justify-between">
                        <span>Other Fee:</span>
                        <span className="font-medium">₹{student.feeStructure.otherFee}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Previous Semester History */}
                {student.semesterFees && student.semesterFees.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-3">Previous Semesters</h4>
                    <div className="space-y-2 text-sm">
                      {student.semesterFees.map((semFee, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>Semester {semFee.semester} ({semFee.academicYear}):</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">₹{semFee.feeStructure?.paidAmount || 0} / ₹{semFee.feeStructure?.totalAmount || 0}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              semFee.status === 'completed' ? 'bg-green-100 text-green-800' :
                              semFee.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {semFee.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QR Generation Form */}
            {student && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Payment QR</h3>
                <form onSubmit={handleQRSubmit(onGenerateQR)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                    <select {...registerQR('semester')} className="input">
                      <option value="">Current Semester ({student.semester})</option>
                      {[...Array(8)].map((_, i) => (
                        <option key={i+1} value={i+1}>
                          Semester {i+1} {i+1 === student.semester ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
                    <select {...registerQR('feeType', { required: 'Fee type is required' })} className="input">
                      <option value="">Select Fee Type</option>
                      <option value="tuition">Tuition Fee</option>
                      <option value="exam">Exam Fee</option>
                      <option value="library">Library Fee</option>
                      <option value="lab">Lab Fee</option>
                      <option value="hostel">Hostel Fee</option>
                      <option value="mess">Mess Fee</option>
                      <option value="other">Other Fee</option>
                      <option value="full">Full Payment</option>
                    </select>
                    {qrErrors.feeType && (
                      <p className="text-danger-600 text-sm mt-1">{qrErrors.feeType.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                    <input
                      type="number"
                      {...registerQR('amount', { 
                        required: 'Amount is required',
                        min: { value: 1, message: 'Amount must be greater than 0' }
                      })}
                      className="input"
                      placeholder="Enter amount..."
                      min="1"
                      step="0.01"
                    />
                    {qrErrors.amount && (
                      <p className="text-danger-600 text-sm mt-1">{qrErrors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                    <textarea
                      {...registerQR('description')}
                      className="input"
                      rows="3"
                      placeholder="Payment description..."
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={generatingQR}
                    className="btn-primary w-full inline-flex items-center justify-center"
                  >
                    {generatingQR ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Generating QR...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Generate QR Code
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column - Generated QR Code */}
          <div className="space-y-6">
            {qrData ? (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated QR Code</h3>
                
                {/* QR Code Image */}
                <div className="text-center mb-6">
                  <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <img 
                      src={qrData.qrCodeImage} 
                      alt="Payment QR Code"
                      className="w-64 h-64 mx-auto"
                    />
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="font-medium">Payment ID:</span>
                    <span className="text-sm text-gray-600">{qrData.paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Amount:</span>
                    <span className="text-green-600 font-semibold">₹{qrData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Fee Type:</span>
                    <span className="capitalize">{qrData.feeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      qrData.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {qrData.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {qrData.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Valid Until:</span>
                    <span className="text-sm text-gray-600">
                      {new Date(qrData.expiresAt).toLocaleString()}
                    </span>
                  </div>
                  {qrData.razorpayPaymentId && (
                    <div className="flex justify-between">
                      <span className="font-medium">Transaction ID:</span>
                      <span className="text-sm text-gray-600">{qrData.razorpayPaymentId}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  {qrData.status !== 'completed' && (
                    <button 
                      onClick={processRazorpayPayment}
                      disabled={processingPayment}
                      className="btn-primary w-full inline-flex items-center justify-center"
                    >
                      {processingPayment ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="ml-2">Processing...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now with Razorpay
                        </>
                      )}
                    </button>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={downloadQR}
                      className="btn-primary flex-1 inline-flex items-center justify-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR
                    </button>
                    <button 
                      onClick={copyQRUrl}
                      className="btn-outline flex-1 inline-flex items-center justify-center"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Payment Options:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Razorpay Payment:</strong> Click "Pay Now" button for web payment (works in test mode)</li>
                    <li>• <strong>QR Code:</strong> Students can scan with UPI apps (requires live mode)</li>
                    <li>• Payment will be processed securely through Razorpay</li>
                    <li>• Status updates automatically after successful payment</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="text-center py-12">
                  <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No QR Code Generated</h3>
                  <p className="text-gray-600">Search for a student and generate a payment QR code.</p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Fee Amounts</h3>
              <div className="grid grid-cols-2 gap-3">
                {student?.feeStructure && (
                  <>
                    {student.feeStructure.tuitionFee > 0 && (
                      <button 
                        onClick={() => {
                          setValueQR('amount', student.feeStructure.tuitionFee);
                          setValueQR('feeType', 'tuition');
                        }}
                        className="btn-outline text-sm"
                        type="button"
                      >
                        Tuition: ₹{student.feeStructure.tuitionFee}
                      </button>
                    )}
                    {student.feeStructure.examFee > 0 && (
                      <button 
                        onClick={() => {
                          setValueQR('amount', student.feeStructure.examFee);
                          setValueQR('feeType', 'exam');
                        }}
                        className="btn-outline text-sm"
                        type="button"
                      >
                        Exam: ₹{student.feeStructure.examFee}
                      </button>
                    )}
                    {student.feeStructure.libraryFee > 0 && (
                      <button 
                        onClick={() => {
                          setValueQR('amount', student.feeStructure.libraryFee);
                          setValueQR('feeType', 'library');
                        }}
                        className="btn-outline text-sm"
                        type="button"
                      >
                        Library: ₹{student.feeStructure.libraryFee}
                      </button>
                    )}
                    {student.feeStructure.labFee > 0 && (
                      <button 
                        onClick={() => {
                          setValueQR('amount', student.feeStructure.labFee);
                          setValueQR('feeType', 'lab');
                        }}
                        className="btn-outline text-sm"
                        type="button"
                      >
                        Lab: ₹{student.feeStructure.labFee}
                      </button>
                    )}
                    {student.feeStructure.hostelFee > 0 && (
                      <button 
                        onClick={() => {
                          setValueQR('amount', student.feeStructure.hostelFee);
                          setValueQR('feeType', 'hostel');
                        }}
                        className="btn-outline text-sm"
                        type="button"
                      >
                        Hostel: ₹{student.feeStructure.hostelFee}
                      </button>
                    )}
                    {student.feeStructure.messFee > 0 && (
                      <button 
                        onClick={() => {
                          setValueQR('amount', student.feeStructure.messFee);
                          setValueQR('feeType', 'mess');
                        }}
                        className="btn-outline text-sm"
                        type="button"
                      >
                        Mess: ₹{student.feeStructure.messFee}
                      </button>
                    )}
                    {student.feeStructure.otherFee > 0 && (
                      <button 
                        onClick={() => {
                          setValueQR('amount', student.feeStructure.otherFee);
                          setValueQR('feeType', 'other');
                        }}
                        className="btn-outline text-sm"
                        type="button"
                      >
                        Other: ₹{student.feeStructure.otherFee}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setValueQR('amount', calculateTotalFee());
                        setValueQR('feeType', 'full');
                      }}
                      className="btn-outline text-sm"
                      type="button"
                    >
                      Full: ₹{calculateTotalFee()}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link to="/admin/dashboard" className="btn-outline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator; 