import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Save, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';

const StudentExamTake = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [examResult, setExamResult] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-save interval
  const [autoSaveInterval, setAutoSaveInterval] = useState(null);

  const recordViolation = useCallback(async (type, description) => {
    try {
      await api.post(`/student/exams/${examId}/violation`, {
        type,
        description
      });
      setViolations(prev => [...prev, { type, description, timestamp: new Date() }]);
    } catch (error) {
      console.error('Error recording violation:', error);
    }
  }, [examId]);

  // Initialize exam
  useEffect(() => {
    const initializeExam = async () => {
      try {
        // Start the exam
        const startResponse = await api.post(`/student/exams/${examId}/start`);
        if (startResponse.data.success) {
          setExamResult(startResponse.data);
          
          // Get exam details
          const examResponse = await api.get(`/student/exams/${examId}`);
          if (examResponse.data.success) {
            setExam(examResponse.data.exam);
            setTimeRemaining(examResponse.data.exam.duration * 60); // Convert to seconds
          }
        }
      } catch (error) {
        console.error('Error initializing exam:', error);
        navigate('/student/exams');
      } finally {
        setLoading(false);
      }
    };

    initializeExam();
  }, [examId, navigate]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && exam) {
      // Auto-submit when time runs out
      handleAutoSubmit();
    }
  }, [timeRemaining, exam]);

  // Auto-save answers
  useEffect(() => {
    if (exam && examResult) {
      const interval = setInterval(() => {
        saveCurrentAnswer();
      }, 30000); // Auto-save every 30 seconds
      
      setAutoSaveInterval(interval);
      return () => clearInterval(interval);
    }
  }, [exam, examResult, currentQuestionIndex]);

  // Prevent tab switching and other violations
  useEffect(() => {
    if (!exam?.settings?.preventTabSwitch) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab-switch', 'Student switched tabs or minimized window');
      }
    };

    const handleBlur = () => {
      recordViolation('window-blur', 'Student switched to another window');
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      recordViolation('right-click', 'Student attempted to right-click');
    };

    const handleKeyDown = (e) => {
      // Prevent common shortcuts
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 's')) {
        e.preventDefault();
        recordViolation('copy-paste', `Student attempted to use ${e.key.toUpperCase()} shortcut`);
      }
      
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        recordViolation('dev-tools', 'Student attempted to open developer tools');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exam, recordViolation]);

  // Fullscreen handling
  useEffect(() => {
    if (exam?.settings?.enableProctoring) {
      const enterFullscreen = async () => {
        try {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } catch (error) {
          console.error('Error entering fullscreen:', error);
        }
      };

      const handleFullscreenChange = () => {
        const isCurrentlyFullscreen = !!document.fullscreenElement;
        setIsFullscreen(isCurrentlyFullscreen);
        
        if (!isCurrentlyFullscreen && exam) {
          recordViolation('fullscreen-exit', 'Student exited fullscreen mode');
        }
      };

      enterFullscreen();
      document.addEventListener('fullscreenchange', handleFullscreenChange);

      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      };
    }
  }, [exam, recordViolation]);

  const saveCurrentAnswer = async () => {
    if (!exam || !examResult || saving) return;

    const currentQuestion = exam.questions[currentQuestionIndex];
    const answer = answers[currentQuestion._id];
    
    if (!answer) return;

    try {
      setSaving(true);
      await api.post(`/student/exams/${examId}/answer`, {
        questionId: currentQuestion._id,
        answer: answer,
        timeTaken: 0 // You could track time per question if needed
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleQuestionNavigation = (direction) => {
    saveCurrentAnswer(); // Save current answer before navigating
    
    if (direction === 'next' && currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit your exam? This action cannot be undone.')) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Save current answer first
      await saveCurrentAnswer();
      
      // Submit exam
      const response = await api.post(`/student/exams/${examId}/submit`);
      
      if (response.data.success) {
        // Clear auto-save interval
        if (autoSaveInterval) {
          clearInterval(autoSaveInterval);
        }
        
        // Exit fullscreen
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        
        navigate('/student/exams', { 
          state: { message: 'Exam submitted successfully!' }
        });
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    try {
      await saveCurrentAnswer();
      await api.post(`/student/exams/${examId}/auto-submit`);
      
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
      
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      
      navigate('/student/exams', { 
        state: { message: 'Exam auto-submitted due to time limit!' }
      });
    } catch (error) {
      console.error('Error auto-submitting exam:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining > 600) return 'text-green-600'; // > 10 minutes
    if (timeRemaining > 300) return 'text-yellow-600'; // > 5 minutes
    return 'text-red-600'; // < 5 minutes
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Exam Not Found</h2>
          <p className="text-gray-600 mb-4">The exam you're looking for doesn't exist or has ended.</p>
          <button
            onClick={() => navigate('/student/exams')}
            className="btn-primary"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exam.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{exam.title}</h1>
              <p className="text-sm text-gray-600">{exam.subject} • {exam.examType}</p>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Timer */}
              <div className={`flex items-center gap-2 ${getTimeColor()}`}>
                <Clock className="h-5 w-5" />
                <span className="text-lg font-mono font-semibold">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              {/* Auto-save indicator */}
              {saving && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Save className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">Saving...</span>
                </div>
              )}
              
              {/* Violations indicator */}
              {violations.length > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{violations.length} violation(s)</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} of {exam.questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          {/* Question */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Question {currentQuestionIndex + 1}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded capitalize">
                  {currentQuestion.difficulty}
                </span>
              </div>
            </div>
            
            <p className="text-gray-900 text-lg leading-relaxed mb-6">
              {currentQuestion.questionText}
            </p>

            {/* Answer Options */}
            <div className="space-y-4">
              {currentQuestion.questionType === 'multiple-choice' && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion._id}`}
                        value={option.text}
                        checked={answers[currentQuestion._id] === option.text}
                        onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                        className="text-blue-600"
                      />
                      <span className="text-gray-900">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.questionType === 'true-false' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentQuestion._id}`}
                      value="true"
                      checked={answers[currentQuestion._id] === 'true'}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-gray-900">True</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentQuestion._id}`}
                      value="false"
                      checked={answers[currentQuestion._id] === 'false'}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-gray-900">False</span>
                  </label>
                </div>
              )}

              {(currentQuestion.questionType === 'short-answer' || currentQuestion.questionType === 'essay') && (
                <textarea
                  className="input w-full"
                  rows={currentQuestion.questionType === 'essay' ? 8 : 4}
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion._id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={() => handleQuestionNavigation('prev')}
              disabled={currentQuestionIndex === 0}
              className="btn-outline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={saveCurrentAnswer}
                disabled={saving}
                className="btn-outline flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Answer'}
              </button>

              {currentQuestionIndex === exam.questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Exam'}
                </button>
              ) : (
                <button
                  onClick={() => handleQuestionNavigation('next')}
                  className="btn-primary flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="card mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Navigator</h3>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {exam.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  saveCurrentAnswer();
                  setCurrentQuestionIndex(index);
                }}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : answers[exam.questions[index]._id]
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        {exam.instructions && exam.instructions.length > 0 && (
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              {exam.instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentExamTake; 