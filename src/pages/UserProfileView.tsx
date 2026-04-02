import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, User as UserIcon, Mail, Phone, MapPin, Clock, BookOpen, Code, GraduationCap, Check } from 'lucide-react';

export function UserProfileView() {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid || !user) return;
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/users/${uid}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else {
          setError('User profile not found');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error || 'Profile not found'}</div>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline flex items-center justify-center mx-auto">
          <ArrowLeft className="h-4 w-4 mr-1" /> Go Back
        </button>
      </div>
    );
  }

  const isFaculty = profile.role === 'faculty';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-24 w-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30 overflow-hidden">
              {profile.profilePic ? (
                <img src={profile.profilePic} alt={profile.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="h-12 w-12 text-white" />
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              <p className="text-blue-100 mt-1 flex items-center justify-center md:justify-start gap-2">
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wider">
                  {profile.role}
                </span>
                <span>•</span>
                <span>{profile.department}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Bio Section */}
          {profile.bio && (
            <section>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                About
              </h2>
              <p className="text-gray-600 leading-relaxed italic">
                "{profile.bio}"
              </p>
            </section>
          )}

          {/* Contact Info */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
              <Mail className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Email</p>
                <p className="text-sm text-gray-900">{profile.email}</p>
              </div>
            </div>
            {profile.phoneNumber && (
              <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <Phone className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Phone</p>
                  <p className="text-sm text-gray-900">{profile.phoneNumber}</p>
                </div>
              </div>
            )}
          </section>

          {/* Role Specific Details */}
          {isFaculty ? (
            <div className="space-y-8">
              {/* Seating Plan */}
              {(profile.block || profile.roomNo) && (
                <section>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                    Seating Plan
                  </h2>
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <p className="text-gray-700">
                      {profile.block && <span className="font-medium">Block {profile.block}</span>}
                      {profile.block && profile.roomNo && <span className="mx-2 text-gray-300">|</span>}
                      {profile.roomNo && <span className="font-medium">Room {profile.roomNo}</span>}
                    </p>
                  </div>
                </section>
              )}

              {/* Subjects */}
              {profile.subjects && (
                <section>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                    Subjects Taught
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects.split(',').map((s: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-sm">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Free Lectures */}
              {profile.freeLectures && profile.freeLectures.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-blue-600" />
                    Free Lectures
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.freeLectures.map((lecture: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                        <span className="font-semibold text-gray-700">{lecture.day}</span>
                        <span className="text-sm text-gray-500">{lecture.timings}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Academic Details */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.semester && (
                  <div className="flex items-center p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <GraduationCap className="h-5 w-5 text-blue-500 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Semester</p>
                      <p className="text-sm text-gray-900 font-semibold">{profile.semester}</p>
                    </div>
                  </div>
                )}
                {profile.section && (
                  <div className="flex items-center p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <div className="h-5 w-5 flex items-center justify-center text-blue-500 mr-3 font-bold">#</div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Section</p>
                      <p className="text-sm text-gray-900 font-semibold">{profile.section}</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Tech Skills */}
              {profile.techSkills && profile.techSkills.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <Code className="h-4 w-4 mr-2 text-blue-600" />
                    Core Tech Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.techSkills.map((skill: string) => (
                      <span key={skill} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Specialization */}
              {profile.specialization && (
                <section>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    Specialization
                  </h2>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {profile.specialization}
                  </p>
                </section>
              )}
            </div>
          )}

          {/* Achievements Section */}
          {profile.achievements && profile.achievements.length > 0 && (
            <section className="pt-8 border-t border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Achievements & Awards
              </h2>
              <ul className="space-y-3">
                {profile.achievements.map((achievement: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 p-3 bg-green-50/30 rounded-lg border border-green-100">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-800">{achievement}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
