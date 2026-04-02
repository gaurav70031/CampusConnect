import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, MessageSquare, PlusCircle, ArrowRight, MapPin, Clock, Users, Check } from 'lucide-react';
import { format } from 'date-fns';

export function Dashboard() {
  const { user, userData } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [enrolledProjects, setEnrolledProjects] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = await user?.getIdToken();
        
        // Fetch projects
        const pRes = await fetch('/api/projects');
        if (pRes.ok) {
          const pData = await pRes.json();
          if (userData.role === 'faculty') {
            setProjects(pData.filter((p: any) => p.facultyId === userData.uid).slice(0, 5));
          } else {
            setProjects(pData.filter((p: any) => p.status === 'open').slice(0, 5));
          }
        }

        // Fetch inquiries (Enrollment Requests)
        const iRes = await fetch('/api/inquiries', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (iRes.ok) {
          const iData = await iRes.json();
          setInquiries(iData.slice(0, 5));
          
          if (userData.role === 'student') {
            setEnrolledProjects(iData.filter((i: any) => i.status === 'accepted').slice(0, 5));
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !userData) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userData.name}</h1>
          <p className="text-gray-500 mt-1">
            {userData.department} • {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
            {userData.section && ` • Sec: ${userData.section}`}
            {userData.group && ` • Group: ${userData.group}`}
          </p>
          {userData.role === 'student' && userData.techSkills && userData.techSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {userData.techSkills.map(skill => (
                <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                  {skill}
                </span>
              ))}
            </div>
          )}
          {userData.role === 'faculty' && (userData.block || userData.roomNo || (userData.freeLectures && userData.freeLectures.length > 0)) && (
            <div className="mt-4 space-y-2">
              {(userData.block || userData.roomNo) && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium mr-1">Seating Plan:</span>
                  {userData.block && <span>Block {userData.block}</span>}
                  {userData.block && userData.roomNo && <span className="mx-1">-</span>}
                  {userData.roomNo && <span>Room {userData.roomNo}</span>}
                </div>
              )}
              {userData.freeLectures && userData.freeLectures.length > 0 && (
                <div className="flex items-start text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                  <div>
                    <span className="font-medium block mb-1">Free Lectures:</span>
                    <ul className="space-y-1">
                      {userData.freeLectures.map((lecture, idx) => (
                        <li key={idx} className="text-gray-500">
                          <span className="font-medium text-gray-700">{lecture.day}:</span> {lecture.timings}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {userData.role === 'faculty' && (
          <Link
            to="/projects/new"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Post Project</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Projects Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
              {userData.role === 'faculty' ? 'Your Projects' : 'Available Projects'}
            </h2>
            <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : projects.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No projects found.</div>
            ) : (
              projects.map(project => (
                <Link key={project.id} to={`/projects/${project.id}`} className="block p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-md font-semibold text-gray-900">{project.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-gray-500">{project.department}</p>
                        {project.expectedTeamSize && (
                          <span className="flex items-center text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                            <Users className="h-3 w-3 mr-1" />
                            {project.expectedTeamSize}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-[10px] rounded-full uppercase tracking-widest font-bold border ${
                      (project.status || 'open') === 'open' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {project.status || 'open'}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Enrollment Requests Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
              {userData.role === 'faculty' ? 'Enrollment Requests' : 'My Enrollment Status'}
            </h2>
            <Link to="/inquiries" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : inquiries.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No recent requests.</div>
            ) : (
              inquiries.map(inquiry => (
                <Link key={inquiry.id} to={`/inquiries/${inquiry.id}`} className="block p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-md font-semibold text-gray-900">{inquiry.projectTitle}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {userData.role === 'faculty' ? `From: ${inquiry.studentName}` : `To: Faculty`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full uppercase tracking-wider font-medium mb-1 ${
                        inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        inquiry.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {inquiry.status === 'accepted' ? 'Selected' : inquiry.status === 'declined' ? 'Rejected' : inquiry.status}
                      </span>
                      <p className="text-xs text-gray-400 block">
                        {inquiry.updatedAt ? format(new Date(inquiry.updatedAt), 'MMM d, yyyy') : 'No date'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Enrolled Projects Section (Student Only) */}
        {userData.role === 'student' && enrolledProjects.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Check className="h-5 w-5 mr-2 text-green-600" />
                My Enrolled Projects
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {enrolledProjects.map(enrollment => (
                <Link 
                  key={enrollment.id} 
                  to={`/projects/${enrollment.projectId}`}
                  className="p-4 border border-green-100 bg-green-50/30 rounded-lg hover:bg-green-50 transition"
                >
                  <h3 className="font-bold text-gray-900 line-clamp-1">{enrollment.projectTitle}</h3>
                  <p className="text-xs text-gray-500 mt-1">Enrolled on {format(new Date(enrollment.updatedAt), 'MMM d, yyyy')}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
