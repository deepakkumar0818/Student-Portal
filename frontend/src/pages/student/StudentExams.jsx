import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, BookOpen, Award, AlertCircle, Play, Eye } from 'lucide-react';
import api from '../../services/api';

const StudentExams = () => {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examsResponse, resultsResponse] = await Promise.all([
        api.get('/student/exams/available'),
        api.get('/student/exams/results')
      ]);

      if (examsResponse.data.success) {
        setExams(examsResponse.data.exams);
      }

      if (resultsResponse.data.success) {
        setResults(resultsResponse.data.results);
      }
    } catch (error) {
      setError('Failed to fetch exam data');
    } finally {
      setLoading(false);
    }
  };

  const startExam = async (examId) => {
    if (!window.confirm('Are you sure you want to start this exam? You cannot pause once started.')) {
      return;
    }

    try {
      const response = await api.post(`/student/exams/${examId}/start`);
      
      if (response.data.success) {
        navigate(`/student/exams/${examId}/take`);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to start exam');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttemptStatusColor = (status) => {
    switch (status) {
      case 'not-attempted': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'evaluated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'text-green-600';
      case 'B+':
      case 'B': return 'text-blue-600';
      case 'C+':
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeRemaining = (timeRemaining) => {
    if (timeRemaining <= 0) return 'Ended';
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Exam Portal</h1>
          <p className="text-gray-600 mt-2">View and take your scheduled exams</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="card mb-6">
          <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'available'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Available Exams ({exams.length})
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'results'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Results ({results.length})
            </button>
          </div>
        </div>

        {/* Available Exams Tab */}
        {activeTab === 'available' && (
          <div className="space-y-6">
            {exams.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No exams available</h3>
                <p className="text-gray-600">Check back later for upcoming exams.</p>
              </div>
            ) : (
              exams.map((exam) => (
                <div key={exam._id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{exam.title}</h3>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(exam.currentStatus)}`}>
                          {exam.currentStatus}
                        </span>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getAttemptStatusColor(exam.attemptStatus)}`}>
                          {exam.attemptStatus.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                        <div>
                          <span className="font-medium">Subject:</span> {exam.subject}
                        </div>
                        <div>
                          <span className="font-medium">Course:</span> {exam.course}
                        </div>
                        <div>
                          <span className="font-medium">Semester:</span> {exam.semester}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {exam.examType}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{new Date(exam.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{exam.duration} minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-gray-400" />
                          <span>{exam.totalMarks} marks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <span>{exam.questions?.length || 0} questions</span>
                        </div>
                      </div>

                      {exam.currentStatus === 'active' && exam.timeRemaining > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">
                              Time remaining: {formatTimeRemaining(exam.timeRemaining)}
                            </span>
                          </div>
                        </div>
                      )}

                      {exam.result && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-green-800">
                                Result: {exam.result.obtainedMarks}/{exam.result.totalMarks} 
                                ({exam.result.percentage}%)
                              </span>
                            </div>
                            <span className={`text-lg font-bold ${getGradeColor(exam.result.grade)}`}>
                              {exam.result.grade}
                            </span>
                          </div>
                        </div>
                      )}

                      {exam.instructions && exam.instructions.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {exam.instructions.map((instruction, index) => (
                              <li key={index}>{instruction}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex flex-col gap-2">
                      {exam.canAttempt && (
                        <button
                          onClick={() => startExam(exam._id)}
                          className="btn-primary flex items-center gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Start Exam
                        </button>
                      )}
                      
                      {exam.result && (
                        <Link
                          to={`/student/exams/results/${exam.result._id || exam._id}`}
                          className="btn-outline flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Result
                        </Link>
                      )}
                      
                      {!exam.canAttempt && !exam.result && exam.currentStatus === 'upcoming' && (
                        <span className="text-sm text-gray-500 text-center">
                          Not yet available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {results.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results available</h3>
                <p className="text-gray-600">Your exam results will appear here once available.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {results.map((result) => (
                  <div key={result._id} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{result.exam.title}</h3>
                        <p className="text-sm text-gray-600">{result.exam.subject} • {result.exam.examType}</p>
                      </div>
                      <span className={`text-2xl font-bold ${getGradeColor(result.grade)}`}>
                        {result.grade}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{result.obtainedMarks}</div>
                        <div className="text-sm text-gray-600">Obtained</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">{result.totalMarks}</div>
                        <div className="text-sm text-gray-600">Total</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{result.percentage}%</div>
                        <div className="text-sm text-gray-600">Percentage</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{result.timeTaken}</div>
                        <div className="text-sm text-gray-600">Minutes</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Submitted: {new Date(result.submittedAt).toLocaleString()}
                      </div>
                      <Link
                        to={`/student/exams/results/${result._id}`}
                        className="btn-outline text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <Link to="/student/dashboard" className="btn-outline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentExams; 