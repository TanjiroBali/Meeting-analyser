import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PlusCircle,
  LogIn,
  Bell,
  CheckSquare,
  History,
  LayoutDashboard,
  UserCheck,
  ChevronDown,
  LogOut,
  ExternalLink,
  Briefcase,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    activePage,
    setActivePage,
    notifications,
    switchRole,
    logout,
  } = useApp();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (activePage === 'login' || !currentUser) {
    return null;
  }

  const isHost = currentUser.role === 'host';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => setActivePage(isHost ? 'host_dashboard' : 'employee_dashboard')}
              className="flex items-center space-x-2.5 group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs group-hover:bg-sky-700 transition-colors">
                <CheckSquare className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                  Anymit
                </span>
                <span className="text-[10px] font-medium text-sky-600 tracking-wider uppercase mt-0.5">
                  Action & Evidence Platform
                </span>
              </div>
            </button>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setActivePage(isHost ? 'host_dashboard' : 'employee_dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  activePage === 'host_dashboard' || activePage === 'employee_dashboard'
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActivePage('past_meetings')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  activePage === 'past_meetings' || activePage === 'meeting_analysis'
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Past Meetings</span>
              </button>

              <button
                onClick={() => setActivePage('join_meeting')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  activePage === 'join_meeting'
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Join Meeting</span>
              </button>
            </nav>
          </div>

          {/* Right: Quick Action Buttons, Role Switcher & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Host quick create meeting button */}
            {isHost && (
              <button
                onClick={() => setActivePage('create_meeting')}
                className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium shadow-xs transition-all active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Meeting</span>
              </button>
            )}

            {/* Quick Role Switcher Pill */}
            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                onClick={() => switchRole('host')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                  isHost
                    ? 'bg-white text-sky-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Host View</span>
              </button>
              <button
                onClick={() => switchRole('employee')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                  !isHost
                    ? 'bg-white text-sky-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Employee View</span>
              </button>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setActivePage('notifications')}
              className="relative p-2 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors focus:outline-none"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none border border-transparent hover:border-slate-200"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-200"
                />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">
                    {currentUser.role}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{currentUser.name}</p>
                    <p className="text-xs text-slate-500">{currentUser.email}</p>
                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-sky-100 text-sky-800 uppercase tracking-wide">
                      {currentUser.title}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        switchRole(isHost ? 'employee' : 'host');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center justify-between"
                    >
                      <span>Switch to {isHost ? 'Employee' : 'Host'} Mode</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
