import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Users, CreditCard, TrendingUp, Calendar, DollarSign, BookOpen, UserCheck } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('month'); // week, month, year

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/admin/analytics?period=${timeFilter}`);
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  // Mock data for demonstration if API doesn't have data
  const mockAnalytics = {
    overview: {
      totalStudents: 150,
      activeStudents: 142,
      totalPayments: 89,
      totalRevenue: 125000,
      pendingPayments: 12,
      successRate: 88.5
    },
    payments: {
      byFeeType: [
        { name: 'Tuition', amount: 85000, count: 45 },
        { name: 'Exam', amount: 25000, count: 30 },
        { name: 'Library', amount: 10000, count: 20 },
        { name: 'Lab', amount: 5000, count: 15 }
      ],
      byStatus: [
        { name: 'Successful', count: 75, percentage: 84.3 },
        { name: 'Pending', count: 10, percentage: 11.2 },
        { name: 'Failed', count: 4, percentage: 4.5 }
      ],
      monthlyTrend: [
        { month: 'Jan', amount: 15000, count: 12 },
        { month: 'Feb', amount: 18000, count: 15 },
        { month: 'Mar', amount: 22000, count: 18 },
        { month: 'Apr', amount: 28000, count: 22 },
        { month: 'May', amount: 25000, count: 20 },
        { month: 'Jun', amount: 30000, count: 25 }
      ]
    },
    students: {
      byCourse: [
        { name: 'B.Tech CSE', count: 45 },
        { name: 'B.Tech ECE', count: 35 },
        { name: 'MBA', count: 25 },
        { name: 'MCA', count: 20 },
        { name: 'Others', count: 25 }
      ],
      bySemester: [
        { semester: 1, count: 25 },
        { semester: 2, count: 22 },
        { semester: 3, count: 20 },
        { semester: 4, count: 18 },
        { semester: 5, count: 15 },
        { semester: 6, count: 12 },
        { semester: 7, count: 10 },
        { semester: 8, count: 8 }
      ]
    }
  };

  const currentAnalytics = analytics || mockAnalytics;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600 mt-2">Comprehensive analytics and insights for your institution</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="input"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{currentAnalytics.overview.totalStudents}</p>
                    <p className="text-sm text-green-600">
                      {currentAnalytics.overview.activeStudents} active
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Payments</p>
                    <p className="text-2xl font-bold text-gray-900">{currentAnalytics.overview.totalPayments}</p>
                    <p className="text-sm text-yellow-600">
                      {currentAnalytics.overview.pendingPayments} pending
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{currentAnalytics.overview.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-green-600">
                      {currentAnalytics.overview.successRate}% success rate
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                    <p className="text-2xl font-bold text-gray-900">+15.3%</p>
                    <p className="text-sm text-green-600">vs last {timeFilter}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Payment by Fee Type */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment by Fee Type</h3>
                <div className="space-y-4">
                  {currentAnalytics.payments.byFeeType.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-3 ${
                          index === 0 ? 'bg-blue-500' :
                          index === 1 ? 'bg-green-500' :
                          index === 2 ? 'bg-yellow-500' : 'bg-purple-500'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">₹{item.amount.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{item.count} payments</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Status */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Status Distribution</h3>
                <div className="space-y-4">
                  {currentAnalytics.payments.byStatus.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-3 ${
                          item.name === 'Successful' ? 'bg-green-500' :
                          item.name === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">{item.count}</div>
                        <div className="text-xs text-gray-500">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Trend (Last 6 Months)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {currentAnalytics.payments.monthlyTrend.map((item, index) => (
                  <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-2">{item.month}</div>
                    <div className="text-lg font-bold text-gray-900">₹{(item.amount / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-gray-500">{item.count} payments</div>
                    <div className={`w-full h-2 rounded-full mt-2 ${
                      index % 2 === 0 ? 'bg-blue-200' : 'bg-green-200'
                    }`}>
                      <div 
                        className={`h-full rounded-full ${
                          index % 2 === 0 ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(item.amount / 30000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Students by Course */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Students by Course</h3>
                <div className="space-y-4">
                  {currentAnalytics.students.byCourse.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-semibold text-gray-900 mr-3">{item.count}</span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(item.count / 45) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Students by Semester */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Students by Semester</h3>
                <div className="grid grid-cols-4 gap-3">
                  {currentAnalytics.students.bySemester.map((item, index) => (
                    <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Sem {item.semester}</div>
                      <div className="text-lg font-bold text-gray-900">{item.count}</div>
                      <div className="w-full h-1 bg-gray-200 rounded-full mt-2">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(item.count / 25) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex items-center">
                  <UserCheck className="h-8 w-8 mr-4" />
                  <div>
                    <p className="text-blue-100">Average Payment per Student</p>
                    <p className="text-2xl font-bold">₹{Math.round(currentAnalytics.overview.totalRevenue / currentAnalytics.overview.totalStudents).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 mr-4" />
                  <div>
                    <p className="text-green-100">Collection Rate</p>
                    <p className="text-2xl font-bold">{currentAnalytics.overview.successRate}%</p>
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 mr-4" />
                  <div>
                    <p className="text-purple-100">Monthly Growth</p>
                    <p className="text-2xl font-bold">+15.3%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">24</div>
                  <div className="text-sm text-gray-600">New Students (This Week)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">156</div>
                  <div className="text-sm text-gray-600">Payments Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">₹89K</div>
                  <div className="text-sm text-gray-600">Revenue Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">12</div>
                  <div className="text-sm text-gray-600">QR Codes Generated</div>
                </div>
              </div>
            </div>
          </div>
        )}

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

export default AdminAnalytics; 