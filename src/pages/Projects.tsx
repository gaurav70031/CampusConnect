import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, PlusCircle, Users } from 'lucide-react';

export function Projects() {
  const { userData } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        } else {
          console.error('Failed to fetch projects');
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.keywords || []).some((k: string) => k.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = filterDept ? p.department === filterDept : true;
    const matchesMine = showOnlyMine ? p.facultyId === userData?.uid : true;
    // Students typically only see open projects unless they are already involved, but let's show all and label them
    return matchesSearch && matchesDept && matchesMine;
  });

  const departments = Array.from(new Set(projects.map(p => p.department))).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Discover and collaborate on academic research.</p>
        </div>
        {userData?.role === 'faculty' && (
          <Link
            to="/projects/new"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Post Project</span>
          </Link>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects, keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">All Domains</option>
              {departments.map(d => (
                <option key={d as string} value={d as string}>{d as string}</option>
              ))}
            </select>
          </div>
          {userData?.role === 'faculty' && (
            <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyMine}
                onChange={(e) => setShowOnlyMine(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>My Projects</span>
            </label>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 text-gray-500">
          No projects found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <Link key={project.id} to={`/projects/${project.id}`} className="block group">
              <div className="bg-white h-full p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition flex flex-col">
                <div className="flex justify-between items-start mb-4">
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
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition line-clamp-2">
                  {project.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
                  {project.description}
                </p>
                <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1">
                    {(project.keywords || []).slice(0, 3).map((kw: string, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                  
                  {userData?.role === 'student' && (project.status || 'open') === 'open' && (
                    <Link 
                      to={`/projects/${project.id}`}
                      className="w-full py-2 bg-blue-600 text-white text-center text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                      Enroll Now
                    </Link>
                  )}

                  <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                    <span>Posted by <span className="font-medium text-gray-700">{project.facultyName}</span></span>
                    {project.expectedTeamSize && (
                      <span className="flex items-center text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                        <Users className="h-3 w-3 mr-1" />
                        {project.expectedTeamSize}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
