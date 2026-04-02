import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, PlusCircle, FileText, Trash2 } from 'lucide-react';

export function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState(userData?.department || '');
  const [keywords, setKeywords] = useState('');
  const [expectedTeamSize, setExpectedTeamSize] = useState<number>(1);
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [supportingDocuments, setSupportingDocuments] = useState<{name: string, type: string, data: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const isEditing = !!id;

  useEffect(() => {
    if (!id || !userData) return;
    
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.facultyId !== userData.uid) {
            navigate('/projects');
            return;
          }
          setTitle(data.title);
          setDescription(data.description);
          setDepartment(data.department);
          setKeywords((data.requirements || []).join(', '));
          setExpectedTeamSize(data.expectedTeamSize || 1);
          setStatus(data.status);
          setSupportingDocuments(data.supportingDocuments || []);
        } else {
          navigate('/projects');
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchProject();
  }, [id, userData, navigate]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 1024 * 1024) { // 1MB limit for Firestore
        alert(`File ${file.name} is too large. Max size is 1MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSupportingDocuments(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: reader.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDocument = (index: number) => {
    setSupportingDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setLoading(true);

    const kwArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0).slice(0, 10);

    const projectData = {
      title,
      description,
      department,
      requirements: kwArray,
      facultyName: userData.name,
      expectedTeamSize,
      status,
      supportingDocuments,
    };

    try {
      const token = await user?.getIdToken();
      if (isEditing) {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(projectData)
        });
        if (res.ok) {
          navigate(`/projects/${id}`);
        }
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(projectData)
        });
        if (res.ok) {
          const data = await res.json();
          navigate(`/projects/${data._id}`);
        }
      }
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to={isEditing ? `/projects/${id}` : '/projects'} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Link>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isEditing ? 'Edit Project' : 'Post a New Project'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Project Title
            </label>
            <input
              type="text"
              id="title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Machine Learning for Climate Prediction"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Domain
            </label>
            <input
              type="text"
              id="department"
              required
              maxLength={100}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Artificial Intelligence, Web Development"
            />
          </div>

          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
              Keywords (comma-separated, max 10)
            </label>
            <input
              type="text"
              id="keywords"
              required
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., AI, Climate, Python"
            />
          </div>

          <div>
            <label htmlFor="expectedTeamSize" className="block text-sm font-medium text-gray-700 mb-1">
              Expected Team Size (1 to 6)
            </label>
            <select
              id="expectedTeamSize"
              value={expectedTeamSize}
              onChange={(e) => setExpectedTeamSize(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num}>{num} {num === 1 ? 'Member' : 'Members'}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Project Description
            </label>
            <textarea
              id="description"
              required
              rows={8}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the goals, requirements, and expected outcomes..."
            />
          </div>

          {isEditing && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'open' | 'closed')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="open">Open (Accepting Inquiries)</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}

          <div className="border-t border-gray-100 pt-6">
            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Supporting Documents (Roadmap, etc.)
            </label>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <PlusCircle className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-400">PDF, DOCX, PPT, TXT (Max 1MB per file)</p>
                  </div>
                  <input type="file" className="hidden" multiple onChange={handleFileUpload} accept=".pdf,.docx,.doc,.txt,.ppt,.pptx" />
                </label>
              </div>

              {supportingDocuments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {supportingDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="p-2 bg-blue-100 rounded text-blue-600 flex-shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-blue-900 truncate">{doc.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="p-1 text-blue-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50 font-medium"
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Post Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
