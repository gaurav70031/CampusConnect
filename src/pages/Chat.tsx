import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Send, User as UserIcon, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export function Chat() {
  const { id } = useParams<{ id: string }>();
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !userData) return;

    const fetchInquiryAndMessages = async () => {
      try {
        const token = await user?.getIdToken();
        const res = await fetch(`/api/inquiries/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setInquiry({ ...data, id: data._id });
          
          // Fetch other user's profile
          const otherUid = userData.role === 'faculty' ? data.studentId : data.facultyId;
          if (otherUid && !otherUser) {
            const userRes = await fetch(`/api/users/${otherUid}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (userRes.ok) {
              setOtherUser(await userRes.json());
            }
          }
        } else {
          return;
        }

        const msgRes = await fetch(`/api/inquiries/${id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } catch (error) {
        console.error('Error fetching chat:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInquiryAndMessages();
    const interval = setInterval(fetchInquiryAndMessages, 3000);

    return () => clearInterval(interval);
  }, [id, userData, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userData || !inquiry) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/inquiries/${inquiry.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: msgText })
      });
      
      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleStatusChange = async (newStatus: 'accepted' | 'declined') => {
    if (!inquiry || userData?.role !== 'faculty') return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setInquiry({ ...inquiry, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCancelInquiry = async () => {
    if (!inquiry || userData?.role !== 'student' || inquiry.status !== 'pending') return;
    console.log(`[Chat] Attempting to cancel inquiry ${inquiry.id}`);
    if (!window.confirm('Are you sure you want to cancel this enrollment request?')) return;

    setCancelling(true);
    try {
      const token = await user?.getIdToken();
      console.log(`[Chat] Sending DELETE request for /api/inquiries/${inquiry.id}`);
      const res = await fetch(`/api/inquiries/${inquiry.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        console.log(`[Chat] Inquiry ${inquiry.id} cancelled successfully`);
        navigate('/inquiries');
      } else {
        const errorData = await res.json();
        console.error(`[Chat] Failed to cancel inquiry ${inquiry.id}:`, errorData);
        alert(errorData.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('[Chat] Error cancelling inquiry:', error);
      alert('An error occurred while cancelling your request.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading conversation...</div>;
  }

  if (!inquiry) {
    return <div className="text-center py-12 text-gray-500">Inquiry not found or unauthorized.</div>;
  }

  const isFaculty = userData?.role === 'faculty';

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/inquiries" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Inquiries
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-200">
              {otherUser?.profilePic ? (
                <img src={otherUser.profilePic} alt={otherUser.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="h-5 w-5 text-blue-700" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                <Link to={`/projects/${inquiry.projectId}`} className="hover:text-blue-600 transition">
                  {inquiry.projectTitle}
                </Link>
              </h2>
              <p className="text-sm text-gray-500">
                {isFaculty ? (
                  <>Applicant: <Link to={`/profile/${inquiry.studentId}`} className="font-medium text-blue-600 hover:underline">{inquiry.studentName}</Link></>
                ) : (
                  <>Faculty: <Link to={`/profile/${inquiry.facultyId}`} className="font-medium text-blue-600 hover:underline">View Profile</Link></>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-xs rounded-full uppercase tracking-wider font-bold ${
              inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              inquiry.status === 'accepted' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {inquiry.status}
            </span>
            
            {isFaculty && inquiry.status === 'pending' && (
              <div className="flex gap-2">
                <button 
                  onClick={() => handleStatusChange('accepted')}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition font-medium"
                >
                  Select Student
                </button>
                <button 
                  onClick={() => handleStatusChange('declined')}
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition font-medium"
                >
                  Reject
                </button>
              </div>
            )}

            {!isFaculty && inquiry.status === 'pending' && (
              <button
                onClick={handleCancelInquiry}
                disabled={cancelling}
                className="flex items-center space-x-1 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 transition border border-red-200 font-medium disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>{cancelling ? 'Cancelling...' : 'Cancel Request'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === userData?.uid;
              return (
                <div key={msg.id || idx} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} max-w-[80%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 mt-1">
                    {isMe ? (
                      userData.profilePic ? (
                        <img src={userData.profilePic} alt="Me" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-700 text-[10px] font-bold">ME</div>
                      )
                    ) : (
                      otherUser?.profilePic ? (
                        <img src={otherUser.profilePic} alt="Other" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-500">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      )
                    )}
                  </div>
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{isMe ? 'You' : msg.senderName}</span>
                      <span className="text-[10px] text-gray-400">{format(new Date(msg.createdAt), 'h:mm a')}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl ${
                      isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center w-10 h-10"
            >
              <Send className="h-5 w-5 ml-[-2px]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
