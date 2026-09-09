import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from './prisma';

interface UserPayload {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
}

interface RoomParticipant {
  socketId: string;
  user: UserPayload;
}

// Track active room participants in memory for fast lookup
const rooms: Map<string, RoomParticipant[]> = new Map();

export function setupSocketServer(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket client connected: ${socket.id}`);

    // 1. JOIN ROOM
    socket.on('join-room', ({ roomId, user }: { roomId: string; user: UserPayload }) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, []);
      }

      const roomParticipants = rooms.get(roomId)!;
      // Remove existing stale socket for same user if any
      const updatedParticipants = roomParticipants.filter((p) => p.user.id !== user.id);
      updatedParticipants.push({ socketId: socket.id, user });
      rooms.set(roomId, updatedParticipants);

      console.log(`👤 User "${user.name}" (${socket.id}) joined room "${roomId}". Room size: ${updatedParticipants.length}`);

      // Send list of existing users to the newly connected user
      const existingPeers = updatedParticipants.filter((p) => p.socketId !== socket.id);
      socket.emit('all-users', existingPeers);

      // Notify existing users about the new participant
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        user,
      });
    });

    // 2. WEBRTC SIGNALING: OFFER
    socket.on('offer', ({ targetSocketId, offer, callerUser }: { targetSocketId: string; offer: any; callerUser: UserPayload }) => {
      io.to(targetSocketId).emit('offer', {
        callerSocketId: socket.id,
        offer,
        callerUser,
      });
    });

    // 3. WEBRTC SIGNALING: ANSWER
    socket.on('answer', ({ targetSocketId, answer }: { targetSocketId: string; answer: any }) => {
      io.to(targetSocketId).emit('answer', {
        responderSocketId: socket.id,
        answer,
      });
    });

    // 4. WEBRTC SIGNALING: ICE CANDIDATE
    socket.on('ice-candidate', ({ targetSocketId, candidate }: { targetSocketId: string; candidate: any }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // 5. LEAVE ROOM
    socket.on('leave-room', ({ roomId }: { roomId: string }) => {
      handleUserLeaving(socket, roomId);
    });

    // 6. HOST ENDS MEETING FOR ALL
    socket.on('host-ended-meeting', async ({ roomId }: { roomId: string }) => {
      console.log(`🛑 Host ended meeting in room "${roomId}"`);

      // Update database status to ENDED & set endedAt
      try {
        await prisma.meeting.update({
          where: { id: roomId },
          data: {
            status: 'ENDED',
            endedAt: new Date(),
          },
        });
      } catch (err) {
        console.error('Failed to update DB meeting status to ENDED:', err);
      }

      // Broadcast meeting-ended-by-host signal to all room participants
      io.in(roomId).emit('meeting-ended-by-host', {
        roomId,
        message: 'The Host has ended this meeting.',
      });

      // Clear room memory
      rooms.delete(roomId);
    });

    // 7. LIVE TRANSCRIPT BROADCAST
    socket.on('send-transcript-line', ({ roomId, transcriptLine }: { roomId: string; transcriptLine: any }) => {
      io.in(roomId).emit('new-transcript-line', transcriptLine);
    });

    // 7. DISCONNECT HANDLER
    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          handleUserLeaving(socket, roomId);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket client disconnected: ${socket.id}`);
    });
  });

  function handleUserLeaving(socket: Socket, roomId: string) {
    socket.leave(roomId);
    const roomParticipants = rooms.get(roomId);
    if (roomParticipants) {
      const filtered = roomParticipants.filter((p) => p.socketId !== socket.id);
      if (filtered.length > 0) {
        rooms.set(roomId, filtered);
      } else {
        rooms.delete(roomId);
      }
    }
    socket.to(roomId).emit('user-left', { socketId: socket.id });
  }
}
