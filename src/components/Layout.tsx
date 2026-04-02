import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, LogOut, MessageSquare, User as UserIcon, Bell, ChevronDown } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export function Layout() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6" />
                <span className="text-xl font-bold tracking-tight">CampusConnect</span>
              </Link>
              
              {userData && (
                <nav className="hidden md:flex space-x-1">
                  <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition">
                    Dashboard
                  </Link>
                  <Link to="/projects" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition">
                    Projects
                  </Link>
                  <Link to="/inquiries" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition">
                    Inquiries
                  </Link>
                </nav>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {userData && <NotificationBell />}
              
              {userData ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-3 p-1.5 rounded-full hover:bg-blue-600 transition focus:outline-none"
                  >
                    <div className="h-8 w-8 rounded-full border-2 border-blue-400 overflow-hidden bg-blue-800 flex items-center justify-center">
                      {userData.profilePic ? (
                        <img src={userData.profilePic} alt={userData.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-blue-200" />
                      )}
                    </div>
                    <div className="hidden md:flex flex-col items-start text-left leading-tight mr-1">
                      <span className="text-sm font-bold truncate max-w-[120px]">{userData.name}</span>
                      <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">{userData.role}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-blue-200 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 text-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-gray-50 md:hidden">
                        <p className="text-sm font-bold text-gray-900">{userData.name}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">{userData.role}</p>
                      </div>
                      
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <UserIcon className="h-4 w-4" />
                        <span className="font-medium">My Profile</span>
                      </Link>
                      
                      <Link
                        to="/notifications"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <Bell className="h-4 w-4" />
                        <span className="font-medium">Notifications</span>
                      </Link>

                      <div className="h-px bg-gray-100 my-1"></div>
                      
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="font-medium">Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : user ? (
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium hover:text-blue-200 transition px-4 py-2"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-gray-100 border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} CampusConnect. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
