import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Users, Settings } from 'lucide-react';
import api from '../../services/api';

const AdminExamCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    course: '',
    semester: '',
    department: '',
    description: '',
    examType: 'midterm',
    passingMarks: '',
    duration: '',
    startDate: '',
    endDate: '',
    instructions: [''],
    questions: [],
    settings: {
      showResultsImmediately: false,
      allowReview: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      preventTabSwitch: true,
      enableProctoring: false
    },
    allowedStudents: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    questionText: '',
    questionType: 'multiple-choice',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
    correctAnswer: '',
    marks: 1,
    difficulty: 'medium'
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/admin/students');
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  const handleInstructionChange = (index, value) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData(prev => ({
      ...prev,
      instructions: newInstructions
    }));
  };

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const removeInstruction = (index) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const handleQuestionChange = (field, value) => {
    setCurrentQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    // If marking as correct, unmark others for single-correct questions
    if (field === 'isCorrect' && value && currentQuestion.questionType === 'multiple-choice') {
      newOptions.forEach((option, i) => {
        if (i !== index) option.isCorrect = false;
      });
    }
    
    setCurrentQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const addOption = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }));
  };

  const removeOption = (index) => {
    if (currentQuestion.options.length > 2) {
      setCurrentQuestion(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.questionText.trim()) {
      alert('Please enter question text');
      return;
    }

    if (currentQuestion.questionType === 'multiple-choice' && 
        !currentQuestion.options.some(opt => opt.isCorrect)) {
      alert('Please mark at least one option as correct');
      return;
    }

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { ...currentQuestion, _id: Date.now() }]
    }));

    // Reset current question
    setCurrentQuestion({
      questionText: '',
      questionType: 'multiple-choice',
      options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
      correctAnswer: '',
      marks: 1,
      difficulty: 'medium'
    });
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleStudentSelection = (studentId, rollNumber) => {
    const isSelected = formData.allowedStudents.some(s => s.student === studentId);
    
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        allowedStudents: prev.allowedStudents.filter(s => s.student !== studentId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        allowedStudents: [...prev.allowedStudents, { student: studentId, rollNumber }]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    if (formData.allowedStudents.length === 0) {
      alert('Please select at least one student');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/admin/exams', formData);
      
      if (response.data.success) {
        navigate('/admin/exams');
      }
    } catch (error) {
      console.error('Error creating exam:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/exams')}
              className="btn-outline flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Exams
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Exam</h1>
              <p className="text-gray-600 mt-2">Set up a new exam with questions and settings</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Title *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter exam title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Enter subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.course}
                  onChange={(e) => handleInputChange('course', e.target.value)}
                  placeholder="Enter course"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester *
                </label>
                <select
                  required
                  className="input"
                  value={formData.semester}
                  onChange={(e) => handleInputChange('semester', e.target.value)}
                >
                  <option value="">Select Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="Enter department"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Type *
                </label>
                <select
                  required
                  className="input"
                  value={formData.examType}
                  onChange={(e) => handleInputChange('examType', e.target.value)}
                >
                  <option value="midterm">Midterm</option>
                  <option value="final">Final</option>
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="practical">Practical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Marks *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="input"
                  value={formData.passingMarks}
                  onChange={(e) => handleInputChange('passingMarks', e.target.value)}
                  placeholder="Enter passing marks"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="input"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  placeholder="Enter duration in minutes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                className="input"
                rows="3"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter exam description (optional)"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
            {formData.instructions.map((instruction, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="input flex-1"
                  value={instruction}
                  onChange={(e) => handleInstructionChange(index, e.target.value)}
                  placeholder={`Instruction ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  className="btn-outline text-red-600 hover:bg-red-50"
                  disabled={formData.instructions.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addInstruction}
              className="btn-outline flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Instruction
            </button>
          </div>

          {/* Questions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Questions ({formData.questions.length})
            </h3>
            
            {/* Add Question Form */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Add New Question</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Type
                  </label>
                  <select
                    className="input"
                    value={currentQuestion.questionType}
                    onChange={(e) => handleQuestionChange('questionType', e.target.value)}
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True/False</option>
                    <option value="short-answer">Short Answer</option>
                    <option value="essay">Essay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={currentQuestion.marks}
                    onChange={(e) => handleQuestionChange('marks', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    className="input"
                    value={currentQuestion.difficulty}
                    onChange={(e) => handleQuestionChange('difficulty', e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text
                </label>
                <textarea
                  className="input"
                  rows="3"
                  value={currentQuestion.questionText}
                  onChange={(e) => handleQuestionChange('questionText', e.target.value)}
                  placeholder="Enter your question here..."
                />
              </div>

              {/* Options for Multiple Choice */}
              {currentQuestion.questionType === 'multiple-choice' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        className="input flex-1"
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                        />
                        <span className="text-sm text-gray-600">Correct</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="btn-outline text-red-600 hover:bg-red-50"
                        disabled={currentQuestion.options.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="btn-outline flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Option
                  </button>
                </div>
              )}

              {/* True/False Options */}
              {currentQuestion.questionType === 'true-false' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Answer
                  </label>
                  <select
                    className="input"
                    value={currentQuestion.correctAnswer}
                    onChange={(e) => handleQuestionChange('correctAnswer', e.target.value)}
                  >
                    <option value="">Select correct answer</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={addQuestion}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>

            {/* Questions List */}
            {formData.questions.length > 0 && (
              <div className="space-y-4">
                {formData.questions.map((question, index) => (
                  <div key={question._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">
                          Q{index + 1}. {question.questionText}
                        </h5>
                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                          <span>Type: {question.questionType}</span>
                          <span>Marks: {question.marks}</span>
                          <span>Difficulty: {question.difficulty}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {question.questionType === 'multiple-choice' && (
                      <div className="mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-2 rounded text-sm ${
                                option.isCorrect
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-gray-50 text-gray-700'
                              }`}
                            >
                              {option.text}
                              {option.isCorrect && ' ✓'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {question.questionType === 'true-false' && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                          Correct Answer: {question.correctAnswer}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Exam Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.showResultsImmediately}
                  onChange={(e) => handleSettingsChange('showResultsImmediately', e.target.checked)}
                />
                <span className="text-sm text-gray-700">Show results immediately after submission</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.allowReview}
                  onChange={(e) => handleSettingsChange('allowReview', e.target.checked)}
                />
                <span className="text-sm text-gray-700">Allow students to review answers</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.shuffleQuestions}
                  onChange={(e) => handleSettingsChange('shuffleQuestions', e.target.checked)}
                />
                <span className="text-sm text-gray-700">Shuffle questions for each student</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.shuffleOptions}
                  onChange={(e) => handleSettingsChange('shuffleOptions', e.target.checked)}
                />
                <span className="text-sm text-gray-700">Shuffle answer options</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.preventTabSwitch}
                  onChange={(e) => handleSettingsChange('preventTabSwitch', e.target.checked)}
                />
                <span className="text-sm text-gray-700">Prevent tab switching during exam</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings.enableProctoring}
                  onChange={(e) => handleSettingsChange('enableProctoring', e.target.checked)}
                />
                <span className="text-sm text-gray-700">Enable proctoring features</span>
              </label>
            </div>
          </div>

          {/* Student Selection */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Students ({formData.allowedStudents.length} selected)
            </h3>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {students.map((student) => (
                <label
                  key={student._id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={formData.allowedStudents.some(s => s.student === student._id)}
                    onChange={() => handleStudentSelection(student._id, student.rollNumber)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {student.rollNumber} • {student.course} • Sem {student.semester}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/exams')}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminExamCreate; 