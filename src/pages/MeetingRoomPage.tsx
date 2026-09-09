import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { UserAvatar } from '../components/common/UserAvatar';
import type { TranscriptItem } from '../types';
import { io, Socket } from 'socket.io-client';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  MessageSquareText,
  CheckSquare,
  Sparkles,
  Plus,
  Zap,
  User,
  Copy,
  Check,
} from 'lucide-react';

interface RemotePeer {
  socketId: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
  };
  stream?: MediaStream;
}

function getSocketServerUrl(): string {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.trim() !== '') {
    return apiUrl.trim().replace(/\/api\/?$/, '');
  }
  return 'http://localhost:5000';
}

const SOCKET_SERVER_URL = getSocketServerUrl();

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19020' },
    { urls: 'stun:stun1.l.google.com:19020' },
  ],
};

export const MeetingRoomPage: React.FC = () => {
  const {
    meetings,
    activeMeetingId,
    setActiveMeetingId,
    setActivePage,
    addAssignment,
    endMeetingById,
    refreshAssignments,
    currentUser,
  } = useApp();

  const [isProcessingAnalysis, setIsProcessingAnalysis] = useState(false);

  const currentMeeting = meetings.find((m) => m.id === activeMeetingId) || meetings[0];
  const isHost = currentUser?.role === 'host' || currentUser?.id === currentMeeting.hostId;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const [showSidebar, setShowSidebar] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [newSpeech, setNewSpeech] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const processedFinalIndicesRef = useRef<Set<number>>(new Set());

  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickAssignee, setQuickAssignee] = useState('');
  const [quickDeadline] = useState('2026-09-14');
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.getUsers();
        if (res.users) setDbUsers(res.users);
      } catch {}
    }
    fetchUsers();
  }, []);

  // Load actual meeting transcripts from database on mount
  useEffect(() => {
    async function loadExistingTranscripts() {
      try {
        const res = await api.getTranscripts(currentMeeting.id);
        if (res.transcripts && res.transcripts.length > 0) {
          const formatted: TranscriptItem[] = res.transcripts.map((t: any) => ({
            id: t.id,
            speaker: t.speaker,
            timestamp: t.timestamp || new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: t.text,
            isActionItem: t.isActionItem,
            actionItemData: t.actionTitle ? {
              title: t.actionTitle,
              assignee: t.actionAssignee || 'Unassigned',
              deadline: t.actionDeadline || 'TBD',
            } : undefined,
          }));
          setTranscript(formatted);
        } else {
          setTranscript([]);
        }
      } catch (err) {
        console.warn('Could not load transcripts from DB:', err);
      }
    }
    loadExistingTranscripts();
  }, [currentMeeting.id]);

  const shouldListenRef = useRef(false);
  const isListeningRef = useRef(false);

  // Setup Web Speech API for live microphone transcribing
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported natively in this browser environment.');
      return;
    }

    processedFinalIndicesRef.current.clear();
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsTranscribing(true);
    };

    recognition.onresult = async (event: any) => {
      let interimString = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const resItem = event.results[i];
        const spokenText = resItem[0]?.transcript?.trim();
        if (resItem.isFinal) {
          if (spokenText && !processedFinalIndicesRef.current.has(i)) {
            processedFinalIndicesRef.current.add(i);
            setNewSpeech('');
            await saveAndBroadcastTranscript(spokenText);
          }
        } else if (spokenText) {
          interimString += spokenText + ' ';
        }
      }
      if (interimString.trim()) {
        setNewSpeech(interimString.trim());
      }
    };

    recognition.onerror = (err: any) => {
      const errType = err?.error || err;
      console.warn('Speech recognition status:', errType);
      if (errType === 'not-allowed' || errType === 'service-not-allowed') {
        shouldListenRef.current = false;
        setIsTranscribing(false);
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      // Auto-restart continuous listening as long as microphone is enabled (300ms safe delay)
      if (shouldListenRef.current && isMicOn) {
        setTimeout(() => {
          if (shouldListenRef.current && !isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.warn('Speech recognition restart note:', e);
            }
          }
        }, 300);
      } else {
        setIsTranscribing(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [currentMeeting.id]);

  // Automatically sync speech recognition listening state with microphone toggle
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isMicOn) {
      shouldListenRef.current = true;
      if (!isListeningRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Start STT error:', e);
        }
      }
    } else {
      shouldListenRef.current = false;
      if (isListeningRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }
  }, [isMicOn]);

  const toggleLiveSTT = () => {
    if (!recognitionRef.current) {
      alert('Web Speech API is not supported in this browser. You can type spoken lines directly into the live transcript input below.');
      return;
    }
    if (isTranscribing) {
      shouldListenRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsTranscribing(false);
    } else {
      shouldListenRef.current = true;
      try {
        recognitionRef.current.start();
        setIsTranscribing(true);
      } catch (e) {
        console.warn('STT start error:', e);
      }
    }
  };

  async function saveAndBroadcastTranscript(text: string) {
    if (!text || !text.trim()) return;
    const speakerName = currentUser?.name || 'Meeting Participant';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newTr: TranscriptItem = {
      id: `tr-${Date.now()}`,
      speaker: speakerName,
      timestamp: timeStr,
      text,
    };

    setTranscript((prev) => [...prev, newTr]);

    try {
      await api.saveTranscript(currentMeeting.id, {
        speaker: speakerName,
        text,
        timestamp: timeStr,
        language: 'en',
      });
    } catch (err) {
      console.warn('Failed to save transcript to DB:', err);
    }

    if (socketRef.current) {
      socketRef.current.emit('send-transcript-line', {
        roomId: currentMeeting.id,
        transcriptLine: newTr,
      });
    }
  }

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initMediaAndSocket() {
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (mediaErr) {
          console.warn('Full video+audio media permission/device error, attempting audio-only:', mediaErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (audioErr) {
            console.warn('Audio media permission/device error, proceeding without local stream:', audioErr);
            stream = null;
          }
        }

        if (stream) {
          setLocalStream(stream);
        }

        const socket = io(SOCKET_SERVER_URL);
        socketRef.current = socket;

        const roomUser = {
          id: currentUser?.id || 'usr-1',
          name: currentUser?.name || 'Sarah Jenkins',
          avatar: currentUser?.avatar || '',
          isHost,
        };

        socket.emit('join-room', {
          roomId: currentMeeting.id,
          user: roomUser,
        });

        socket.on('all-users', (existingUsers: RemotePeer[]) => {
          existingUsers.forEach((peer) => {
            createPeerConnection(peer.socketId, peer.user, stream, socket, true);
          });
        });

        socket.on('user-joined', ({ socketId, user }: RemotePeer) => {
          createPeerConnection(socketId, user, stream, socket, false);
        });

        socket.on('offer', async ({ callerSocketId, offer, callerUser }) => {
          let pc = peersRef.current.get(callerSocketId);
          if (!pc) {
            pc = createPeerConnection(callerSocketId, callerUser, stream, socket, false);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('answer', {
            targetSocketId: callerSocketId,
            answer,
          });
        });

        socket.on('answer', async ({ responderSocketId, answer }) => {
          const pc = peersRef.current.get(responderSocketId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
          const pc = peersRef.current.get(senderSocketId);
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

        socket.on('user-left', ({ socketId }: { socketId: string }) => {
          closePeerConnection(socketId);
        });

        socket.on('new-transcript-line', (line: TranscriptItem) => {
          setTranscript((prev) => {
            if (prev.some((x) => x.id === line.id)) return prev;
            return [...prev, line];
          });
        });

        socket.on('meeting-ended-by-host', ({ roomId }: { roomId?: string }) => {
          cleanupMediaAndSocket();
          const targetId = roomId || currentMeeting?.id;
          if (targetId) {
            setActiveMeetingId(targetId);
          }
          setActivePage('meeting_analysis');
        });
      } catch (err) {
        console.error('Error initializing video media or socket:', err);
      }
    }

    initMediaAndSocket();

    return () => {
      cleanupMediaAndSocket();
    };
  }, [currentMeeting.id]);

  function createPeerConnection(
    targetSocketId: string,
    user: RemotePeer['user'],
    stream: MediaStream | null,
    socket: Socket,
    isInitiator: boolean
  ): RTCPeerConnection {
    const pc = new RTCPeerConnection(rtcConfig);
    peersRef.current.set(targetSocketId, pc);

    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemotePeers((prev) => {
        const existingIndex = prev.findIndex((p) => p.socketId === targetSocketId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], stream: remoteStream };
          return updated;
        }
        return [...prev, { socketId: targetSocketId, user, stream: remoteStream }];
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', {
            targetSocketId,
            offer,
            callerUser: {
              id: currentUser?.id || 'usr-1',
              name: currentUser?.name || 'Sarah Jenkins',
              avatar: currentUser?.avatar || '',
              isHost,
            },
          });
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      };
    }

    setRemotePeers((prev) => {
      if (prev.some((p) => p.socketId === targetSocketId)) return prev;
      return [...prev, { socketId: targetSocketId, user }];
    });

    return pc;
  }

  function closePeerConnection(socketId: string) {
    const pc = peersRef.current.get(socketId);
    if (pc) {
      pc.close();
      peersRef.current.delete(socketId);
    }
    setRemotePeers((prev) => prev.filter((p) => p.socketId !== socketId));
  }

  function cleanupMediaAndSocket() {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId: currentMeeting.id });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }

  function handleLeaveRoom() {
    cleanupMediaAndSocket();
    setActivePage(isHost ? 'host_dashboard' : 'employee_dashboard');
  }

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn;
        setIsCameraOn(!isCameraOn);
      }
    }
  };

  const handleHostEndMeeting = async () => {
    if (window.confirm('Are you sure you want to end this meeting for all participants and trigger Gemini AI Analysis?')) {
      setIsProcessingAnalysis(true);
      setActiveMeetingId(currentMeeting.id);

      if (socketRef.current) {
        socketRef.current.emit('host-ended-meeting', { roomId: currentMeeting.id });
      }
      await endMeetingById(currentMeeting.id, 'Meeting ended by host.');

      // Trigger real Gemini AI Analysis on database transcripts
      try {
        await api.triggerAIAnalysis(currentMeeting.id, currentUser?.id || 'usr-1');
      } catch (err: any) {
        console.warn('AI Analysis Note:', err.message);
      }

      await refreshAssignments();
      setIsProcessingAnalysis(false);
      setActivePage('meeting_analysis');
    }
  };

  const handleAddSpeech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpeech.trim()) return;

    await saveAndBroadcastTranscript(newSpeech.trim());
    setNewSpeech('');
  };

  const handleTagActionItem = (item: TranscriptItem) => {
    const title = item.actionItemData?.title || item.text;
    const assigneeName = item.actionItemData?.assignee || 'Unassigned';
    const deadline = item.actionItemData?.deadline || 'TBD';

    addAssignment({
      meetingId: currentMeeting.id,
      meetingTitle: currentMeeting.title,
      title: `Action Item: ${title.slice(0, 40)}...`,
      description: item.text,
      assigneeId: '',
      assigneeName,
      assigneeAvatar: '',
      assignerId: currentUser?.id || '',
      assignerName: currentUser?.name || 'Host',
      deadline,
      priority: 'high',
      status: 'todo',
      evidenceRequired: 'Submitted PR link or verified test proof',
    });

    alert(`Action item tagged for ${assigneeName}!`);
  };

  const handleCreateQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    addAssignment({
      meetingId: currentMeeting.id,
      meetingTitle: currentMeeting.title,
      title: quickTaskTitle.trim(),
      description: 'Tagged live during meeting discussion.',
      assigneeId: '',
      assigneeName: quickAssignee,
      assigneeAvatar: '',
      assignerId: currentUser?.id || '',
      assignerName: currentUser?.name || 'Host',
      deadline: quickDeadline,
      priority: 'medium',
      status: 'todo',
      evidenceRequired: 'Submitted implementation link or documentation',
    });
    setQuickTaskTitle('');
  };

  const [roomCopiedCode, setRoomCopiedCode] = useState(false);

  const handleCopyMeetingCode = () => {
    if (currentMeeting?.inviteCode) {
      navigator.clipboard.writeText(currentMeeting.inviteCode);
      setRoomCopiedCode(true);
      setTimeout(() => setRoomCopiedCode(false), 2000);
    }
  };

  return (
    <div className="relative h-[calc(100vh-5rem)] flex flex-col bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 text-white">
      {isProcessingAnalysis && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-4 text-center p-6">
          <Sparkles className="w-12 h-12 text-sky-400 animate-bounce" />
          <h2 className="text-xl font-bold text-white">Analyzing Discussion with Gemini AI...</h2>
          <p className="text-xs text-slate-300 max-w-md leading-relaxed">
            Extracting tasks, assigned employees, deadlines, and transcript evidence quotes from PostgreSQL records.
          </p>
        </div>
      )}
      {/* Top Meeting Title Bar */}
      <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h2 className="text-sm font-bold text-white">{currentMeeting.title}</h2>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span>Host: <strong className="text-slate-200">{currentMeeting.hostName}</strong></span>
              <span>•</span>
              <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                <span>Code:</span>
                <span className="font-mono font-bold text-sky-400 tracking-wider">{currentMeeting.inviteCode}</span>
                <button
                  type="button"
                  onClick={handleCopyMeetingCode}
                  className="p-1 hover:text-white text-slate-400 transition-colors"
                  title="Copy Meeting Code"
                >
                  {roomCopiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            showSidebar ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <MessageSquareText className="w-3.5 h-3.5" />
          <span>Live Actions & Transcript</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 bg-slate-950 overflow-y-auto flex flex-col justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
            {/* Local Video Tile */}
            <div className="relative aspect-video rounded-2xl bg-slate-900 overflow-hidden border-2 border-sky-500/80 shadow-lg group">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover filter contrast-[1.02] ${!isCameraOn ? 'hidden' : ''}`}
              />

              {!isCameraOn && (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <User className="w-12 h-12 stroke-[1.5]" />
                  <span className="text-xs font-medium">Camera Turned Off</span>
                </div>
              )}

              <div className="absolute bottom-3 left-3 px-3 py-1 bg-slate-950/85 backdrop-blur-md rounded-lg text-xs font-medium text-white border border-slate-800 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{currentUser?.name || 'Sarah Jenkins'} (You)</span>
                {isHost && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white uppercase tracking-wider">
                    HOST
                  </span>
                )}
              </div>
            </div>

            {/* Remote Participant Video Tiles */}
            {remotePeers.map((peer) => (
              <RemoteVideoTile key={peer.socketId} peer={peer} />
            ))}
          </div>
        </div>

        {showSidebar && (
          <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col justify-between">
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Live Action Capture</h3>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                Real-time
              </span>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto text-xs">
              {transcript.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    item.isActionItem
                      ? 'bg-sky-950/60 border-sky-600/80 text-sky-100 space-y-2'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-200">{item.speaker}</span>
                    <span className="text-slate-500">{item.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{item.text}</p>

                  {item.isActionItem && (
                    <div className="pt-2 border-t border-sky-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Action Item Extracted</span>
                        </span>
                      </div>
                      <p className="font-bold text-white text-xs">{item.actionItemData?.title}</p>
                      <div className="flex items-center justify-between text-[11px] text-sky-200">
                        <span>Assignee: <strong>{item.actionItemData?.assignee}</strong></span>
                        <span>Due: <strong>{item.actionItemData?.deadline}</strong></span>
                      </div>
                      <button
                        onClick={() => handleTagActionItem(item)}
                        className="w-full mt-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center justify-center space-x-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Confirm & Assign Work</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-3">
              <form onSubmit={handleCreateQuickTask} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Tag Action Item</span>
                </div>
                <input
                  type="text"
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder="Tag new task (e.g. Alex to fix auth bug)..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <div className="flex items-center space-x-2">
                  <select
                    value={quickAssignee}
                    onChange={(e) => setQuickAssignee(e.target.value)}
                    className="flex-1 px-2 py-1 text-[11px] bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Select Assignee...</option>
                    {dbUsers.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.title || u.role})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tag Task</span>
                  </button>
                </div>
              </form>

              <form onSubmit={handleAddSpeech} className="pt-2 border-t border-slate-800 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleLiveSTT}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shrink-0 ${
                    isTranscribing
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={isTranscribing ? 'Stop Live Speech Transcribing' : 'Start Live Speech Transcribing (Web Speech)'}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{isTranscribing ? 'Listening...' : 'Live STT'}</span>
                </button>
                <input
                  type="text"
                  value={newSpeech}
                  onChange={(e) => setNewSpeech(e.target.value)}
                  placeholder="Type or speak into transcript..."
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Light Blue Bottom Control Bar */}
      <div className="px-6 py-4 bg-sky-950 border-t border-sky-900/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-xl transition-all ${
              isMicOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
            }`}
            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-3 rounded-xl transition-all ${
              isCameraOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
            }`}
            title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isCameraOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl transition-colors"
          >
            Leave Room
          </button>

          {isHost && (
            <button
              onClick={handleHostEndMeeting}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center space-x-2 active:scale-[0.98]"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Host End Meeting</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const RemoteVideoTile: React.FC<{ peer: RemotePeer }> = ({ peer }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative aspect-video rounded-2xl bg-slate-900 overflow-hidden border border-slate-800 shadow-md">
      {peer.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover filter contrast-[1.02]"
        />
      ) : (
        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center space-y-2">
          <UserAvatar name={peer.user.name} avatar={peer.user.avatar} size="lg" className="w-16 h-16 text-xl" />
          <span className="text-xs text-slate-400 font-medium">Participant Connected (Audio Active)</span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 px-3 py-1 bg-slate-950/85 backdrop-blur-md rounded-lg text-xs font-medium text-white border border-slate-800 flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>{peer.user.name}</span>
        {peer.user.isHost && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white uppercase tracking-wider">
            HOST
          </span>
        )}
      </div>
    </div>
  );
};
