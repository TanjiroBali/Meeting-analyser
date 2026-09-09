import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserAvatar } from '../components/common/UserAvatar';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  LogIn,
  ShieldCheck,
  ArrowLeft,
  Volume2,
} from 'lucide-react';

export const JoinMeetingPage: React.FC = () => {
  const { currentUser, joinMeetingByCode, setActivePage } = useApp();

  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inviteCode.trim()) {
      setError('Please enter a valid meeting code.');
      return;
    }

    try {
      const joinedMeeting = await joinMeetingByCode(inviteCode.trim());

      if (!joinedMeeting) {
        setError(`No active meeting found for code "${inviteCode.trim().toUpperCase()}".`);
        return;
      }

      if (joinedMeeting.status === 'completed') {
        setError('This meeting has concluded and can no longer be joined.');
        return;
      }

      setActivePage('meeting_room');
    } catch (err: any) {
      setError(err.message || `No active meeting found for code "${inviteCode.trim().toUpperCase()}".`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <button
          onClick={() => setActivePage('host_dashboard')}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Join Meeting Room</h1>
          <p className="text-xs text-slate-500">
            Check your microphone and camera settings before entering the discussion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Col: Device Preview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
            Audio & Video Device Preview
          </h3>

          <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
            {isCameraOn ? (
              <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center space-y-2">
                <UserAvatar name={displayName} avatar={currentUser?.avatar} size="lg" className="w-16 h-16 text-xl" />
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-950/80 backdrop-blur-xs rounded text-[10px] text-white font-medium flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{displayName} (Camera Active Preview)</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2 text-slate-400">
                <VideoOff className="w-10 h-10 stroke-[1.5]" />
                <span className="text-xs font-medium">Camera is turned off</span>
              </div>
            )}

            <div className="absolute bottom-3 right-3 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-2 rounded-lg transition-colors ${
                  isMicOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-rose-600 text-white'
                }`}
                title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsCameraOn(!isCameraOn)}
                className={`p-2 rounded-lg transition-colors ${
                  isCameraOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-rose-600 text-white'
                }`}
                title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span className="flex items-center space-x-1">
                <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Microphone Level Test</span>
              </span>
              <span className="text-emerald-700 font-bold">{isMicOn ? 'Good' : 'Muted'}</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isMicOn ? 'w-3/4 bg-emerald-500' : 'w-0 bg-slate-400'
                }`}
              ></div>
            </div>
          </div>
        </div>

        {/* Right Col: Join Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between space-y-6">
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Enter Meeting Passcode</h3>
              <p className="text-xs text-slate-500">
                Paste your unique 4-letter meeting code (e.g. ABCD) to enter
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                Meeting Code *
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. ABCD"
                className="w-full px-4 py-2.5 text-sm font-mono font-bold uppercase tracking-wider bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                Display Name in Room
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              <span>Join Meeting Room Now</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted WebRTC channel with Socket.IO signaling.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
