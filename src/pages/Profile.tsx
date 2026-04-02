import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, BookOpen, Phone, Check, X, Plus, Trash2, Camera, RotateCcw } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../lib/cropImage';

const TECH_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C++', 'C#',
  'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL', 'NoSQL', 'MongoDB',
  'PostgreSQL', 'MySQL', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Machine Learning',
  'Data Science', 'AI', 'TensorFlow', 'PyTorch', 'Figma', 'UI/UX', 'HTML', 'CSS', 'Tailwind',
  'Next.js', 'Vue', 'Angular', 'Svelte', 'GraphQL', 'REST APIs', 'Spring Boot', 'Django', 'Flask'
];

const COUNTRY_CODES = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'Australia' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+81', country: 'Japan' },
  { code: '+86', country: 'China' },
  { code: '+7', country: 'Russia' },
  { code: '+55', country: 'Brazil' },
  { code: '+27', country: 'South Africa' },
  { code: '+82', country: 'South Korea' },
  { code: '+39', country: 'Italy' },
  { code: '+34', country: 'Spain' },
  { code: '+1', country: 'Canada' },
  { code: '+52', country: 'Mexico' },
  { code: '+62', country: 'Indonesia' },
  { code: '+92', country: 'Pakistan' },
  { code: '+880', country: 'Bangladesh' },
  { code: '+234', country: 'Nigeria' },
  { code: '+20', country: 'Egypt' },
  { code: '+90', country: 'Turkey' },
  { code: '+66', country: 'Thailand' },
  { code: '+84', country: 'Vietnam' },
  { code: '+63', country: 'Philippines' },
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+65', country: 'Singapore' },
  { code: '+60', country: 'Malaysia' },
  { code: '+31', country: 'Netherlands' },
  { code: '+41', country: 'Switzerland' },
  { code: '+46', country: 'Sweden' },
  { code: '+47', country: 'Norway' },
  { code: '+45', country: 'Denmark' },
  { code: '+358', country: 'Finland' },
  { code: '+353', country: 'Ireland' },
  { code: '+64', country: 'New Zealand' },
  { code: '+54', country: 'Argentina' },
  { code: '+56', country: 'Chile' },
  { code: '+57', country: 'Colombia' },
  { code: '+51', country: 'Peru' },
  { code: '+94', country: 'Sri Lanka' },
  { code: '+977', country: 'Nepal' },
  { code: '+93', country: 'Afghanistan' },
  { code: '+98', country: 'Iran' },
  { code: '+964', country: 'Iraq' },
  { code: '+972', country: 'Israel' },
  { code: '+962', country: 'Jordan' },
  { code: '+965', country: 'Kuwait' },
  { code: '+961', country: 'Lebanon' },
  { code: '+968', country: 'Oman' },
  { code: '+974', country: 'Qatar' },
  { code: '+963', country: 'Syria' },
  { code: '+967', country: 'Yemen' },
  { code: '+30', country: 'Greece' },
  { code: '+31', country: 'Netherlands' },
  { code: '+32', country: 'Belgium' },
  { code: '+33', country: 'France' },
  { code: '+34', country: 'Spain' },
  { code: '+36', country: 'Hungary' },
  { code: '+39', country: 'Italy' },
  { code: '+40', country: 'Romania' },
  { code: '+41', country: 'Switzerland' },
  { code: '+43', country: 'Austria' },
  { code: '+44', country: 'UK' },
  { code: '+45', country: 'Denmark' },
  { code: '+46', country: 'Sweden' },
  { code: '+47', country: 'Norway' },
  { code: '+48', country: 'Poland' },
  { code: '+49', country: 'Germany' },
  { code: '+351', country: 'Portugal' },
  { code: '+352', country: 'Luxembourg' },
  { code: '+353', country: 'Ireland' },
  { code: '+354', country: 'Iceland' },
  { code: '+355', country: 'Albania' },
  { code: '+356', country: 'Malta' },
  { code: '+357', country: 'Cyprus' },
  { code: '+358', country: 'Finland' },
  { code: '+359', country: 'Bulgaria' },
  { code: '+370', country: 'Lithuania' },
  { code: '+371', country: 'Latvia' },
  { code: '+372', country: 'Estonia' },
  { code: '+373', country: 'Moldova' },
  { code: '+374', country: 'Armenia' },
  { code: '+375', country: 'Belarus' },
  { code: '+376', country: 'Andorra' },
  { code: '+377', country: 'Monaco' },
  { code: '+378', country: 'San Marino' },
  { code: '+380', country: 'Ukraine' },
  { code: '+381', country: 'Serbia' },
  { code: '+382', country: 'Montenegro' },
  { code: '+385', country: 'Croatia' },
  { code: '+386', country: 'Slovenia' },
  { code: '+387', country: 'Bosnia' },
  { code: '+389', country: 'Macedonia' },
  { code: '+420', country: 'Czech Republic' },
  { code: '+421', country: 'Slovakia' },
  { code: '+423', country: 'Liechtenstein' },
].sort((a, b) => a.country.localeCompare(b.country));

export function Profile() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [techSkills, setTechSkills] = useState<string[]>([]);
  const [block, setBlock] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [subjects, setSubjects] = useState('');
  const [section, setSection] = useState('');
  const [semester, setSemester] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [achievements, setAchievements] = useState<string[]>([]);
  const [freeLectures, setFreeLectures] = useState<{day: string, timings: string}[]>([]);
  const [cuchdEmail, setCuchdEmail] = useState('');
  const [cuchdEmailVerified, setCuchdEmailVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // Cropping states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setDepartment(userData.department || '');
      setSpecialization(userData.specialization || '');
      setBio(userData.bio || '');
      if (userData.phoneNumber) {
        const match = userData.phoneNumber.match(/^(\+\d{1,4})\s*(\d+)$/);
        if (match) {
          setCountryCode(match[1]);
          setPhoneNumber(match[2]);
        } else {
          setPhoneNumber(userData.phoneNumber);
        }
      } else {
        setPhoneNumber('');
      }
      setTechSkills(userData.techSkills || []);
      setBlock(userData.block || '');
      setRoomNo(userData.roomNo || '');
      setSubjects(userData.subjects || '');
      setSection(userData.section || '');
      setSemester(userData.semester || '');
      setProfilePic(userData.profilePic || '');
      setAchievements(userData.achievements || []);
      setFreeLectures(userData.freeLectures || []);
      setCuchdEmail(userData.cuchdEmail || '');
      setCuchdEmailVerified(userData.cuchdEmailVerified || false);
    }
  }, [userData]);

  if (!user || !userData) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  const toggleSkill = (skill: string) => {
    setTechSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const addFreeLecture = () => {
    setFreeLectures([...freeLectures, { day: 'Monday', timings: '' }]);
  };

  const removeFreeLecture = (index: number) => {
    setFreeLectures(freeLectures.filter((_, i) => i !== index));
  };

  const updateFreeLecture = (index: number, field: 'day' | 'timings', value: string) => {
    const updated = [...freeLectures];
    updated[index][field] = value;
    setFreeLectures(updated);
  };

  const addAchievement = () => {
    setAchievements([...achievements, '']);
  };

  const removeAchievement = (index: number) => {
    setAchievements(achievements.filter((_, i) => i !== index));
  };

  const updateAchievement = (index: number, value: string) => {
    const updated = [...achievements];
    updated[index] = value;
    setAchievements(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { // 2MB limit for original file before cropping
        setError('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    try {
      if (imageToCrop && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        if (croppedImage) {
          setProfilePic(croppedImage);
          setIsCropping(false);
          setImageToCrop(null);
        }
      }
    } catch (e) {
      console.error(e);
      setError('Failed to crop image');
    }
  };

  const deleteProfilePic = () => {
    setProfilePic('');
  };

  const handleSendOtp = async () => {
    if (!cuchdEmail || !cuchdEmail.endsWith('@cuchd.in')) {
      setError('Please enter a valid CUCHD email address (@cuchd.in)');
      return;
    }
    setError('');
    setSendingOtp(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cuchdEmail })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send OTP');
      }
      setShowOtpInput(true);
      setSuccessMessage('OTP sent to your CUCHD email');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }
    setError('');
    setVerifyingOtp(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/cuchd/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: cuchdEmail, otp })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid OTP');
      }
      setCuchdEmailVerified(true);
      setShowOtpInput(false);
      setSuccessMessage('CUCHD email verified successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...userData,
          name,
          department,
          specialization: userData.role === 'student' ? specialization : undefined,
          bio,
          phoneNumber: phoneNumber ? `${countryCode}${phoneNumber}` : '',
          techSkills: userData.role === 'student' ? techSkills : undefined,
          block: userData.role === 'faculty' ? block : undefined,
          roomNo: userData.role === 'faculty' ? roomNo : undefined,
          subjects: userData.role === 'faculty' ? subjects : undefined,
          section: userData.role === 'student' ? section : undefined,
          semester: userData.role === 'student' ? semester : undefined,
          profilePic,
          achievements,
          freeLectures: userData.role === 'faculty' ? freeLectures : undefined,
          cuchdEmail,
          cuchdEmailVerified,
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      setSuccessMessage('Profile updated successfully! Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 mb-8 pb-6 border-b border-gray-100">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-blue-100 border-2 border-blue-200 flex items-center justify-center">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="h-10 w-10 text-blue-700" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex flex-col space-y-1">
              <label className="bg-blue-600 p-1.5 rounded-full text-white cursor-pointer hover:bg-blue-700 transition shadow-md block">
                <Camera className="h-4 w-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
              {profilePic && (
                <button
                  type="button"
                  onClick={deleteProfilePic}
                  className="bg-red-500 p-1.5 rounded-full text-white cursor-pointer hover:bg-red-600 transition shadow-md"
                  title="Delete Photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900">Update Profile</h1>
            <p className="text-gray-500">Manage your personal information and skills</p>
          </div>
        </div>

        {/* Cropping Modal */}
        {isCropping && imageToCrop && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Crop Profile Photo</h3>
                <button onClick={() => setIsCropping(false)} className="p-1 hover:bg-gray-200 rounded-full transition">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="relative flex-1 min-h-[300px] bg-gray-900">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-gray-500">
                    <span>Zoom</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsCropping(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCropSave}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                  >
                    Apply Crop
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {userData.role === 'faculty' ? 'Employee ID (EID)' : 'Student ID (UID)'}
              </label>
              <input
                type="text"
                disabled
                value={userData.universityId || ''}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {userData.role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., AI & ML, Data Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., A, B, C"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
              <div className="flex">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-3 py-2 border border-gray-300 border-r-0 rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-700 max-w-[150px]"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={`${c.country}-${c.code}`} value={c.code}>
                      {c.country} ({c.code})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setPhoneNumber(val);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">CUCHD Email</label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={cuchdEmail}
                    onChange={(e) => {
                      setCuchdEmail(e.target.value);
                      if (e.target.value !== userData.cuchdEmail) {
                        setCuchdEmailVerified(false);
                      }
                    }}
                    disabled={cuchdEmailVerified}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${cuchdEmailVerified ? 'bg-green-50 border-green-200' : ''}`}
                    placeholder="yourname@cuchd.in"
                  />
                  {cuchdEmailVerified && (
                    <div className="absolute right-3 top-2.5 text-green-600 flex items-center text-xs font-bold">
                      <Check className="h-4 w-4 mr-1" /> Verified
                    </div>
                  )}
                </div>
                {!cuchdEmailVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !cuchdEmail || !cuchdEmail.endsWith('@cuchd.in')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {sendingOtp ? 'Sending...' : 'Verify'}
                  </button>
                )}
              </div>
              {showOtpInput && !cuchdEmailVerified && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-blue-800 mb-1 uppercase tracking-wider">Enter Verification Code</p>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono tracking-widest"
                      placeholder="000000"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otp.length !== 6}
                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {verifyingOtp ? 'Verifying...' : 'Submit OTP'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {userData.role === 'faculty' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Block</label>
                <select
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Select Block</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="A3">A3</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="B3">B3</option>
                  <option value="B4">B4</option>
                  <option value="B5">B5</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                  <option value="C3">C3</option>
                  <option value="D1">D1</option>
                  <option value="D2">D2</option>
                  <option value="D3">D3</option>
                  <option value="D4">D4</option>
                  <option value="D5">D5</option>
                  <option value="D6">D6</option>
                  <option value="D7">D7</option>
                  <option value="D8">D8</option>
                  <option value="DD1">DD1</option>
                  <option value="DD2">DD2</option>
                  <option value="DD3">DD3</option>
                  <option value="DD4">DD4</option>
                  <option value="DD5">DD5</option>
                  <option value="E1">E1</option>
                  <option value="E2">E2</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Room No</label>
                <input
                  type="text"
                  value={roomNo}
                  onChange={(e) => setRoomNo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., 204"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subjects You Teach</label>
                <input
                  type="text"
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., Data Structures, Operating Systems"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          {userData.role === 'student' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Tech Skills</label>
              <div className="flex flex-wrap gap-2">
                {TECH_SKILLS.map(skill => {
                  const isSelected = techSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        isSelected 
                          ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' 
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {userData.role === 'faculty' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-semibold text-gray-700">Free Lectures</label>
                <button
                  type="button"
                  onClick={addFreeLecture}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Slot
                </button>
              </div>
              
              {freeLectures.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No free lecture slots added yet.</p>
              ) : (
                <div className="space-y-3">
                  {freeLectures.map((lecture, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <select
                        value={lecture.day}
                        onChange={(e) => updateFreeLecture(index, 'day', e.target.value)}
                        className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                      </select>
                      <input
                        type="text"
                        value={lecture.timings}
                        onChange={(e) => updateFreeLecture(index, 'timings', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="e.g., 10:00 AM - 11:30 AM"
                      />
                      <button
                        type="button"
                        onClick={() => removeFreeLecture(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Achievements Section */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-semibold text-gray-700">Achievements & Awards</label>
              <button
                type="button"
                onClick={addAchievement}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Achievement
              </button>
            </div>
            
            {achievements.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No achievements added yet. Showcase your success!</p>
            ) : (
              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={achievement}
                      onChange={(e) => updateAchievement(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="e.g., Winner of National Hackathon 2025"
                    />
                    <button
                      type="button"
                      onClick={() => removeAchievement(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
