import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { LoginPage } from './pages/LoginPage';
import { HostDashboardPage } from './pages/HostDashboardPage';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage';
import { CreateMeetingPage } from './pages/CreateMeetingPage';
import { JoinMeetingPage } from './pages/JoinMeetingPage';
import { MeetingRoomPage } from './pages/MeetingRoomPage';
import { MeetingAnalysisPage } from './pages/MeetingAnalysisPage';
import { PastMeetingsPage } from './pages/PastMeetingsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { CheckSquare, ShieldCheck } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activePage } = useApp();

  const renderPage = () => {
    switch (activePage) {
      case 'login':
        return <LoginPage />;
      case 'host_dashboard':
        return <HostDashboardPage />;
      case 'employee_dashboard':
        return <EmployeeDashboardPage />;
      case 'create_meeting':
        return <CreateMeetingPage />;
      case 'join_meeting':
        return <JoinMeetingPage />;
      case 'meeting_room':
        return <MeetingRoomPage />;
      case 'meeting_analysis':
        return <MeetingAnalysisPage />;
      case 'past_meetings':
        return <PastMeetingsPage />;
      case 'notifications':
        return <NotificationsPage />;
      default:
        return <HostDashboardPage />;
    }
  };

  if (activePage === 'login') {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {renderPage()}
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-sky-600" />
            <span className="font-bold text-slate-800">Anymit</span>
            <span>— Meeting Discussion to Evidence Platform</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Frontend Prototype Version 1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
