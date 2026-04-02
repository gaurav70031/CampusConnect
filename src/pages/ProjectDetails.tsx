import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit, MessageSquare, Users, PlusCircle, FileText, Download, Star, ShieldCheck, Upload, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existingInquiry, setExistingInquiry] = useState<any>(null);
  const [creatingInquiry, setCreatingInquiry] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [appointingLeader, setAppointingLeader] = useState<string | null>(null);
  const [cancellingInquiry, setCancellingInquiry] = useState(false);

  const fetchProjectAndInquiry = async () => {
    if (!id || !userData) return;
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject({ ...data, id: data._id });
        
        // Fetch inquiries for this project to get team members
        const token = await user?.getIdToken();
        const iqRes = await fetch('/api/inquiries', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (iqRes.ok) {
          const inquiries = await iqRes.json();
          const projectInquiries = inquiries.filter((iq: any) => iq.projectId === id);
          
          if (userData.role === 'student') {
            const existing = projectInquiries.find((iq: any) => iq.studentId === userData.uid);
            setExistingInquiry(existing ? { ...existing, id: existing._id } : null);
          }
          
          setTeamMembers(projectInquiries.filter((iq: any) => iq.status === 'accepted'));
        }
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndInquiry();
  }, [id, userData]);

  if (!project) {
    return <div className="text-center py-12 text-gray-500">Project not found.</div>;
  }

  const isOwner = userData?.role === 'faculty' && project.facultyId === userData.uid;

  const handleInquire = async () => {
    if (!project || !userData || userData.role !== 'student') return;

    if (project.expectedTeamSize && teamMembers.length >= project.expectedTeamSize) {
      alert('This project team is already full. You cannot enroll at this time.');
      return;
    }

    setCreatingInquiry(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: project.id,
          projectTitle: project.title,
          studentName: userData.name,
          facultyId: project.facultyId,
          status: 'pending'
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        navigate(`/inquiries/${data._id}`);
      } else {
        console.error('Failed to create inquiry');
      }
    } catch (error) {
      console.error('Error creating inquiry:', error);
    } finally {
      setCreatingInquiry(false);
    }
  };

  const handleCancelInquiry = async () => {
    if (!existingInquiry || !userData || userData.role !== 'student') return;
    console.log(`[ProjectDetails] Attempting to cancel inquiry ${existingInquiry.id}`);
    if (!window.confirm('Are you sure you want to cancel your enrollment request?')) return;

    setCancellingInquiry(true);
    try {
      const token = await user?.getIdToken();
      console.log(`[ProjectDetails] Sending DELETE request for /api/inquiries/${existingInquiry.id}`);
      const res = await fetch(`/api/inquiries/${existingInquiry.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        console.log(`[ProjectDetails] Inquiry ${existingInquiry.id} cancelled successfully`);
        setExistingInquiry(null);
        // Refresh project data to update team members if they were already accepted
        fetchProjectAndInquiry();
      } else {
        const errorData = await res.json();
        console.error(`[ProjectDetails] Failed to cancel inquiry ${existingInquiry.id}:`, errorData);
        alert(errorData.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('[ProjectDetails] Error cancelling inquiry:', error);
      alert('An error occurred while cancelling your request.');
    } finally {
      setCancellingInquiry(false);
    }
  };

  const handleAppointLeader = async (studentId: string) => {
    if (!project || !isOwner) return;
    setAppointingLeader(studentId);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ teamLeaderId: studentId })
      });
      if (res.ok) {
        setProject(prev => ({ ...prev, teamLeaderId: studentId }));
      }
    } catch (error) {
      console.error('Error appointing leader:', error);
    } finally {
      setAppointingLeader(null);
    }
  };

  const handleReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !existingInquiry) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Report file is too large. Max size is 2MB.');
      return;
    }

    setUploadingReport(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const token = await user?.getIdToken();
        const res = await fetch(`/api/inquiries/${existingInquiry.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            projectReport: {
              name: file.name,
              type: file.type,
              data: reader.result as string
            }
          })
        });
        if (res.ok) {
          const updated = await res.json();
          setExistingInquiry(prev => ({ ...prev, projectReport: updated.projectReport }));
          alert('Project report uploaded successfully!');
        }
      } catch (error) {
        console.error('Error uploading report:', error);
      } finally {
        setUploadingReport(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const downloadFile = (name: string, data: string) => {
    const link = document.createElement('a');
    link.href = data;
    link.download = name;
    link.click();
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading project details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/projects" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
      </Link>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">
                {project.department}
              </span>
              <span className={`px-2 py-1 text-[10px] rounded-full uppercase tracking-widest font-bold border ${
                (project.status || 'open') === 'open' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}>
                {project.status || 'open'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <p className="text-sm text-gray-500">
                Posted by <Link to={`/profile/${project.facultyId}`} className="font-medium text-blue-600 hover:underline">{project.facultyName}</Link> on {format(new Date(project.createdAt), 'MMMM d, yyyy')}
              </p>
              {project.expectedTeamSize && (
                <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                  <Users className="h-4 w-4 mr-1.5 text-gray-500" />
                  <span>Expected Team Size: <strong>{project.expectedTeamSize}</strong></span>
                </div>
              )}
            </div>
          </div>
          
          {isOwner && (
            <Link
              to={`/projects/${project.id}/edit`}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Project</span>
            </Link>
          )}

          {userData?.role === 'student' && project.status === 'open' && !existingInquiry && (
            <button
              onClick={handleInquire}
              disabled={creatingInquiry || (project.expectedTeamSize && teamMembers.length >= project.expectedTeamSize)}
              className={`flex items-center space-x-2 px-6 py-2 rounded-md transition disabled:opacity-50 ${
                project.expectedTeamSize && teamMembers.length >= project.expectedTeamSize
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              <span>
                {creatingInquiry 
                  ? 'Enrolling...' 
                  : (project.expectedTeamSize && teamMembers.length >= project.expectedTeamSize 
                      ? 'Team Full' 
                      : 'Enroll in Project')}
              </span>
            </button>
          )}

          {userData?.role === 'student' && existingInquiry && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={`/inquiries/${existingInquiry.id}`}
                className="flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
              >
                <MessageSquare className="h-4 w-4" />
                <span>View Enrollment Status</span>
              </Link>
              {existingInquiry.status === 'pending' && (
                <button
                  onClick={handleCancelInquiry}
                  disabled={cancellingInquiry}
                  className="flex items-center justify-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-md hover:bg-red-100 transition border border-red-200 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  <span>{cancellingInquiry ? 'Cancelling...' : 'Cancel Request'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="prose max-w-none text-gray-700 mb-8 whitespace-pre-wrap">
          {project.description}
        </div>

        {project.supportingDocuments && project.supportingDocuments.length > 0 && (
          <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Supporting Documents & Roadmap
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {project.supportingDocuments.map((doc: any, i: number) => (
                <button
                  key={i}
                  onClick={() => downloadFile(doc.name, doc.data)}
                  className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg hover:border-blue-400 transition group"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 truncate">{doc.name}</span>
                  </div>
                  <Download className="h-4 w-4 text-blue-400 group-hover:text-blue-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Project Team
            </h3>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No team members enrolled yet.</p>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.studentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {member.studentName.charAt(0)}
                      </div>
                      <div>
                        <Link to={`/profile/${member.studentId}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {member.studentName}
                        </Link>
                        {project.teamLeaderId === member.studentId && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                            <Star className="h-2.5 w-2.5 mr-1" /> Team Leader
                          </span>
                        )}
                      </div>
                    </div>
                    {isOwner && project.teamLeaderId !== member.studentId && (
                      <button
                        onClick={() => handleAppointLeader(member.studentId)}
                        disabled={appointingLeader !== null}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider flex items-center"
                      >
                        {appointingLeader === member.studentId ? 'Appointing...' : (
                          <>
                            <ShieldCheck className="h-3 w-3 mr-1" /> Appoint Leader
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {existingInquiry?.status === 'accepted' && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Project Report
              </h3>
              {existingInquiry.projectReport ? (
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Report Uploaded</span>
                    </div>
                    <button
                      onClick={() => downloadFile(existingInquiry.projectReport.name, existingInquiry.projectReport.data)}
                      className="text-xs font-bold text-green-700 hover:underline flex items-center"
                    >
                      <Download className="h-3 w-3 mr-1" /> Download
                    </button>
                  </div>
                  <div className="text-xs text-green-700 bg-white/50 p-2 rounded border border-green-200 truncate">
                    {existingInquiry.projectReport.name}
                  </div>
                  <label className="block">
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider cursor-pointer hover:underline">
                      Update Report
                    </span>
                    <input type="file" className="hidden" onChange={handleReportUpload} accept=".pdf,.docx,.doc,.txt" />
                  </label>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center space-y-3">
                  <Upload className="h-8 w-8 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-500">Upload your final project report (PDF, DOCX, TXT)</p>
                  <label className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-blue-700 transition">
                    {uploadingReport ? 'Uploading...' : 'Choose File'}
                    <input type="file" className="hidden" onChange={handleReportUpload} accept=".pdf,.docx,.doc,.txt" disabled={uploadingReport} />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {(project.keywords || []).map((kw: string, i: number) => (
              <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
