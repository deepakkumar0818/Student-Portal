import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';

const StudentLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    console.log('Attempting login with:', { rollNumber: data.rollNumber });
    const result = await login(data, 'student');
    console.log('Login result:', result);
    
    if (result.success) {
      console.log('Login successful, navigating to dashboard...');
      const from = location.state?.from?.pathname || '/student/dashboard';
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 100); // Small delay to ensure state is updated
    } else {
      console.error('Login failed:', result.error);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <GraduationCap className="h-16 w-16 mb-6" />
          <h2 className="text-4xl font-bold mb-4 text-center">Student Portal</h2>
          <p className="text-xl text-center text-primary-100">
            Access your academic information, fee status, and make payments securely
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="lg:hidden mb-6">
              <GraduationCap className="h-12 w-12 text-primary-600 mx-auto" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Student Login</h2>
            <p className="text-gray-600 mt-2">Sign in to access your student portal</p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Roll Number
                </label>
                <input
                  id="rollNumber"
                  type="text"
                  {...register('rollNumber', {
                    required: 'Roll number is required',
                    pattern: {
                      value: /^[A-Z0-9]+$/i,
                      message: 'Invalid roll number format'
                    }
                  })}
                  className={`input ${errors.rollNumber ? 'input-error' : ''}`}
                  placeholder="Enter your roll number"
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.rollNumber && (
                  <p className="text-danger-600 text-sm mt-1">{errors.rollNumber.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-danger-600 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Are you an administrator?{' '}
                <Link to="/admin/login" className="text-primary-600 hover:text-primary-500 font-medium">
                  Admin Login
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-primary-600 hover:text-primary-500 font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin; 