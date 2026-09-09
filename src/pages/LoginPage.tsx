import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, getApiBaseUrl, setApiBaseUrl } from '../services/api';
import { CheckSquare, ShieldCheck, UserCheck, Briefcase, ArrowRight, Mail, User, Building, Settings, Server, Check } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { setCurrentUser, setActivePage } = useApp();
  const [selectedRole, setSelectedRole] = useState<'host' | 'employee'>('host');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [customBackendUrl, setCustomBackendUrl] = useState(() => getApiBaseUrl());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleRoleSelect = (role: 'host' | 'employee') => {
    setSelectedRole(role);
  };

  const handleSaveBackendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(customBackendUrl);
    setSavedSuccess(true);
    setError('');
    setTimeout(() => {
      setSavedSuccess(false);
      setShowConfig(false);
    }, 1200);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.login(
        email.trim(),
        selectedRole,
        name.trim() || undefined,
        title.trim() || undefined,
        department.trim() || undefined
      );

      if (res.user) {
        localStorage.setItem('anymit_user', JSON.stringify(res.user));
        setCurrentUser(res.user);
        if (res.user.role === 'host') {
          setActivePage('host_dashboard');
        } else {
          setActivePage('employee_dashboard');
        }
      } else {
        setError('Login failed. Please check backend connection.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to authenticate with backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-sm mb-4">
          <CheckSquare className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Anymit</h1>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          Convert meeting discussions into verified work assignments & evidence.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10 space-y-6">
          {/* Role Selection Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Account Role
              </label>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs font-medium text-slate-500 hover:text-sky-600 flex items-center space-x-1 transition-colors"
                title="Configure Backend Server URL"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Backend Settings</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleRoleSelect('host')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                  selectedRole === 'host'
                    ? 'bg-white text-sky-700 shadow-xs border border-sky-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Host (Manager)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('employee')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                  selectedRole === 'employee'
                    ? 'bg-white text-sky-700 shadow-xs border border-sky-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Employee (Assignee)</span>
              </button>
            </div>
          </div>

          {/* Backend Server URL Configurator */}
          {showConfig && (
            <form onSubmit={handleSaveBackendUrl} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                <Server className="w-4 h-4 text-sky-600" />
                <span>Production Backend Server URL</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Set your deployed HTTPS backend URL (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded">https://your-backend.onrender.com/api</code>) if you haven't set Netlify environment variables yet.
              </p>
              <input
                type="url"
                value={customBackendUrl}
                onChange={(e) => setCustomBackendUrl(e.target.value)}
                placeholder="https://your-backend-api.com/api"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                required
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  type="submit"
                  className="py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                >
                  {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{savedSuccess ? 'Saved!' : 'Save Server URL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiBaseUrl('');
                    setCustomBackendUrl(getApiBaseUrl());
                    setShowConfig(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Reset Default
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 leading-relaxed">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@company.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={selectedRole === 'host' ? 'Product Manager' : 'Software Engineer'}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Department
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Engineering"
                    className="w-full pl-8 pr-2 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer badge */}
          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PostgreSQL Database Workspace</span>
          </div>
        </div>
      </div>
    </div>
  );
};
