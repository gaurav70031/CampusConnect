import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Users, ArrowRight, Phone, X, Mail, Lock, User as UserIcon, Hash, Layout, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES } from '../constants/countries';

export function Home() {
  const { 
    user, 
    userData, 
    loading: authLoading, 
    hasDismissedProfilePrompt,
    setHasDismissedProfilePrompt,
    login, 
    loginWithEmail, 
    signUpWithEmail, 
    sendEmailOTP, 
    verifyEmailOTP, 
    logout,
    completeProfile,
    refreshUserData
  } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [section, setSection] = useState('');
  const [group, setGroup] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [specialization, setSpecialization] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  
  // If user is logged in (e.g., via Google) but has no profile data, show the sign up modal
  React.useEffect(() => {
    if (user && !userData && !authLoading && !hasDismissedProfilePrompt && !showAuthModal) {
      setIsLoginMode(false);
      setShowAuthModal(true);
    }
  }, [user, userData, authLoading, hasDismissedProfilePrompt, showAuthModal]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user && userData) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSendOtp = async () => {
    if (!email) {
      setError('Email is required to send OTP');
      return;
    }
    setSendingOtp(true);
    setError('');
    try {
      await sendEmailOTP(email);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        let loginEmail = email;
        
        // If it's not an email format, try looking up by UID/EID
        if (!email.includes('@')) {
          const lookupRes = await fetch('/api/auth/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: email })
          });
          
          if (!lookupRes.ok) {
            const errorData = await lookupRes.json();
            throw new Error(errorData.error || 'User not found with this ID');
          }
          
          const lookupData = await lookupRes.json();
          loginEmail = lookupData.email;
        }

        if (authMethod === 'password') {
          await loginWithEmail(loginEmail, password);
        } else {
          if (!showOtpInput) {
            await sendEmailOTP(loginEmail);
            setShowOtpInput(true);
            setLoading(false);
            return;
          } else {
            await verifyEmailOTP(loginEmail, otp);
          }
        }
      } else {
        // Validate phone number
        if (phoneNumber.length !== 10) {
          throw new Error('Phone number must be exactly 10 digits');
        }

        // If user is already authenticated (e.g. via Google) but lacks profile data
        if (user) {
          await completeProfile({
            name: name || user.displayName || 'Anonymous',
            universityId,
            email: user.email || email,
            phoneNumber: phoneNumber ? `${countryCode}${phoneNumber}` : '',
            role,
            department: department || '',
            specialization: role === 'student' ? specialization : '',
            section: role === 'student' ? section : '',
            group: role === 'student' ? group : '',
            bio: bio || ''
          });
          
          setShowAuthModal(false);
          navigate('/dashboard');
          return;
        }

        if (!otpSent) {
          throw new Error('Please verify your email with OTP first');
        }
        if (!otp) {
          throw new Error('OTP is required');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        // Verify OTP first without signing in
        await verifyEmailOTP(email, otp, true);
        
        // Create user with email and password
        await signUpWithEmail(email, password, name);
        
        // Complete profile immediately
        await completeProfile({
          name: name || 'Anonymous',
          universityId,
          email: email,
          phoneNumber: phoneNumber ? `${countryCode}${phoneNumber}` : '',
          role,
          department: department || '',
          specialization: role === 'student' ? specialization : '',
          section: role === 'student' ? section : '',
          group: role === 'student' ? group : '',
          bio: bio || ''
        });

        setShowAuthModal(false);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl text-center space-y-8">
        <div className="flex justify-center">
          <div className="bg-blue-100 p-4 rounded-full">
            <BookOpen className="h-16 w-16 text-blue-700" />
          </div>
        </div>
        
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
          Welcome to <span className="text-blue-700">CampusConnect</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          The collaborative platform bridging the gap between faculty expertise and student ambition. 
          Discover projects, connect with mentors, and start building your academic future.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={login}
            className="flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-700 hover:bg-blue-800 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
          >
            Continue with Google <ArrowRight className="ml-2 h-5 w-5" />
          </button>
          <button
            onClick={() => { setIsLoginMode(false); setShowAuthModal(true); setAuthMethod('password'); setShowOtpInput(false); }}
            className="flex items-center justify-center px-8 py-4 border-2 border-blue-700 text-lg font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 shadow-sm hover:shadow-md transition-all w-full sm:w-auto"
          >
            Sign Up
          </button>
        </div>

        <p className="text-sm text-gray-500 pt-4">
          Already have an account? <button onClick={() => { setIsLoginMode(true); setShowAuthModal(true); setAuthMethod('password'); setShowOtpInput(false); }} className="text-blue-700 font-semibold hover:underline">Log In</button>
        </p>

        {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col relative overflow-hidden">
              <button 
                onClick={() => {
                  setShowAuthModal(false);
                  setHasDismissedProfilePrompt(true);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-white/80 rounded-full p-1 backdrop-blur-sm"
              >
                <X className="h-6 w-6" />
              </button>
              
              <div className="p-8 overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {isLoginMode ? (showOtpInput ? 'Enter Verification Code' : 'Login') : 'Create Account'}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {isLoginMode ? (showOtpInput ? `Enter the 6-digit code sent to ${email}` : 'Welcome back! Please login to your account.') : 'Fill in your details to get started.'}
                </p>

                {isLoginMode && (
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6">
                    <button
                      type="button"
                      onClick={() => { setAuthMethod('password'); setShowOtpInput(false); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMethod === 'password' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMethod('otp'); setShowOtpInput(false); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMethod === 'otp' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Email OTP
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {isLoginMode ? (
                    <>
                      {showOtpInput ? (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Verification Code</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              required
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="123456"
                              maxLength={6}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email / UID / EID</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="email@example.com or UID/EID"
                              />
                            </div>
                          </div>

                          {authMethod === 'password' && (
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                  type="password"
                                  required
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="••••••••"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    /* Sign Up Form */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">I am a...</label>
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setRole('student')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${role === 'student' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            Student
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole('faculty')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${role === 'faculty' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            Faculty
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder={role === 'faculty' ? 'Dr. Jane Doe' : 'John Doe'}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
                          <input
                            type="text"
                            required
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder={role === 'faculty' ? 'e.g., Computer Science' : 'e.g., CS'}
                          />
                        </div>
                      </div>

                      <div className={`grid ${role === 'student' ? 'grid-cols-3' : 'grid-cols-1'} gap-3`}>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                            {role === 'faculty' ? 'Employee ID (EID)' : 'Student ID (UID)'}
                          </label>
                          <input
                            type="text"
                            required
                            value={universityId}
                            onChange={(e) => setUniversityId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder={role === 'faculty' ? 'EMP-2024-01' : '2021CS001'}
                          />
                        </div>
                        {role === 'student' && (
                          <>
                            <div className="col-span-1">
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sec</label>
                              <input
                                type="text"
                                required
                                value={section}
                                onChange={(e) => setSection(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="A"
                              />
                            </div>
                            <div className="col-span-1">
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Group</label>
                              <input
                                type="text"
                                required
                                value={group}
                                onChange={(e) => setGroup(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="G1"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {role === 'student' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Specialization (Optional)</label>
                          <input
                            type="text"
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g., AI & ML, Data Science"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number</label>
                        <div className="flex gap-2">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          >
                            {COUNTRIES.map(c => (
                              <option key={c.code} value={c.code}>{c.code} {c.flag}</option>
                            ))}
                          </select>
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="tel"
                              required
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              maxLength={10}
                              pattern="\d{10}"
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="9876543210"
                            />
                          </div>
                        </div>
                      </div>

                      {!user && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                  type="email"
                                  required
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="email@example.com"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={sendingOtp || otpSent}
                                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 disabled:opacity-50 whitespace-nowrap"
                              >
                                {sendingOtp ? 'Sending...' : (otpSent ? 'Sent' : 'Send OTP')}
                              </button>
                            </div>
                          </div>

                          {otpSent && (
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">OTP Verification</label>
                              <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                  type="text"
                                  required
                                  value={otp}
                                  onChange={(e) => setOtp(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="123456"
                                  maxLength={6}
                                />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
                              <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="••••••••"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Confirm</label>
                              <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bio (Optional)</label>
                        <textarea
                          rows={2}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                          placeholder="Tell us about your interests..."
                        />
                      </div>
                    </div>
                  )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : (
                        isLoginMode 
                          ? (authMethod === 'otp' ? (showOtpInput ? 'Verify OTP' : 'Send OTP') : 'Login')
                          : 'Sign Up'
                      )}
                    </button>

                  <div className="text-center space-y-4">
                    {!user && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsLoginMode(!isLoginMode);
                          setError('');
                          setShowOtpInput(false);
                        }}
                        className="text-sm text-blue-700 font-semibold hover:underline"
                      >
                        {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                      </button>
                    )}
                    
                    {user && (
                      <div className="pt-4 border-t border-gray-100 flex flex-col items-center space-y-3">
                        <p className="text-xs text-gray-500">
                          Logged in as <span className="font-semibold text-gray-700">{user.email}</span>
                        </p>
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => refreshUserData()}
                            className="text-sm text-blue-600 font-semibold hover:underline"
                          >
                            Refresh Data
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAuthModal(false);
                              logout();
                            }}
                            className="text-sm text-red-600 font-semibold hover:underline"
                          >
                            Log Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!user && (
                    <>
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">Or</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAuthModal(false);
                          login();
                        }}
                        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                      >
                        Continue with Google
                      </button>
                    </>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-16 text-left">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <Users className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">For Faculty</h3>
            <p className="text-gray-600">Post academic opportunities, offer your expertise, and mentor students to help them drive their own research and projects forward.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <BookOpen className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">For Students</h3>
            <p className="text-gray-600">Browse exciting academic projects, filter by your department or interests, and connect directly with professors.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
