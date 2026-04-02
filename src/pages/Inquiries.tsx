import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, ArrowRight, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export function Inquiries() {
  const { userData, user } = useAuth();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchInquiries = async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/inquiries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data);
      } else {
        console.error('Failed to fetch inquiries');
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [userData]);

  const handleCancelInquiry = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[Inquiries] Attempting to cancel inquiry ${id}`);
    if (!window.confirm('Are you sure you want to cancel this enrollment request?')) return;

    setCancellingId(id);
    try {
      const token = await user?.getIdToken();
      console.log(`[Inquiries] Sending DELETE request for /api/inquiries/${id}`);
      const res = await fetch(`/api/inquiries/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        console.log(`[Inquiries] Inquiry ${id} cancelled successfully`);
        setInquiries(prev => prev.filter(iq => iq.id !== id));
      } else {
        const errorData = await res.json();
        console.error(`[Inquiries] Failed to cancel inquiry ${id}:`, errorData);
        alert(errorData.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('[Inquiries] Error cancelling inquiry:', error);
      alert('An error occurred while cancelling your request.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enrollment Requests</h1>
        <p className="text-gray-500">
          {userData?.role === 'faculty' ? 'Manage student applications and selections.' : 'Track your project enrollment status.'}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading inquiries...</div>
          ) : inquiries.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No enrollment requests yet</h3>
              <p className="text-gray-500 mt-1">
                {userData?.role === 'faculty' 
                  ? "You haven't received any enrollment requests for your projects." 
                  : "You haven't enrolled in any projects yet."}
              </p>
              {userData?.role === 'student' && (
                <Link to="/projects" className="mt-4 text-blue-600 hover:text-blue-800 font-medium">
                  Browse Projects
                </Link>
              )}
            </div>
          ) : (
            inquiries.map(inquiry => (
              <Link key={inquiry.id} to={`/inquiries/${inquiry.id}`} className="block p-6 hover:bg-gray-50 transition group">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">
                        {inquiry.projectTitle}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full uppercase tracking-wider font-medium ${
                        inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        inquiry.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {inquiry.status === 'accepted' ? 'Selected' : inquiry.status === 'declined' ? 'Rejected' : inquiry.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {userData?.role === 'faculty' ? (
                        <>Applicant: <span className="font-medium text-gray-900">{inquiry.studentName}</span></>
                      ) : (
                        <>Application to Faculty Project</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-4">Last updated {inquiry.updatedAt ? format(new Date(inquiry.updatedAt), 'MMM d, yyyy') : 'No date'}</span>
                    {userData?.role === 'student' && inquiry.status === 'pending' && (
                      <button
                        onClick={(e) => handleCancelInquiry(e, inquiry.id)}
                        disabled={cancellingId === inquiry.id}
                        className="mr-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition disabled:opacity-50"
                        title="Cancel Request"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    )}
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
