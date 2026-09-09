import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { generateUniqueMeetingCode } from '../utils/generateMeetingCode';
import { processAIAnalysis, AIAnalysisStructuredResponse } from '../services/aiAnalysisService';
import { analyzeMeetingTranscriptWithGemini } from '../services/geminiService';

export const apiRouter = Router();

// ==========================================
// 1. LOGIN API
// ==========================================
apiRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, role, name, title, department } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      const defaultName = name && name.trim() ? name.trim() : cleanEmail.split('@')[0].replace('.', ' ');
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: defaultName,
          role: role || 'employee',
          avatar: '',
          title: title || (role === 'host' ? 'Meeting Host' : 'Team Member'),
          department: department || 'Engineering',
        },
      });
    } else if (name || role || title || department) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name ? name.trim() : user.name,
          role: role || user.role,
          title: title || user.title,
          department: department || user.department,
        },
      });
    }

    res.json({ message: 'Login successful', user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// ==========================================
// 2. CREATE MEETING API
// ==========================================
apiRouter.post('/meetings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, hostId, agenda, status, participantIds } = req.body;

    if (!title || !hostId) {
      res.status(400).json({ error: 'Title and hostId are required' });
      return;
    }

    const code = await generateUniqueMeetingCode(prisma);
    const meetingStatus = status || 'WAITING';
    const now = new Date();

    const meeting = await prisma.meeting.create({
      data: {
        code,
        title,
        description: description || '',
        status: meetingStatus,
        hostId,
        createdAt: now,
        startedAt: meetingStatus === 'ACTIVE' ? now : null,
        agenda: JSON.stringify(agenda || ['Review discussion topics', 'Extract action items']),
        decisions: JSON.stringify([]),
      },
      include: {
        host: true,
        participants: { include: { user: true } },
      },
    });

    await prisma.meetingParticipant.create({
      data: {
        meetingId: meeting.id,
        userId: hostId,
        role: 'Host',
      },
    });

    if (Array.isArray(participantIds)) {
      for (const pId of participantIds) {
        if (pId !== hostId) {
          await prisma.meetingParticipant.create({
            data: {
              meetingId: meeting.id,
              userId: pId,
              role: 'Participant',
            },
          });
        }
      }
    }

    await prisma.notification.create({
      data: {
        title: 'Meeting Created',
        message: `"${meeting.title}" created with code ${code}.`,
        type: 'meeting',
        targetRole: 'all',
      },
    });

    const refreshed = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        host: true,
        participants: { include: { user: true } },
      },
    });

    res.status(201).json({ message: 'Meeting created successfully', meeting: refreshed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create meeting' });
  }
});

// ==========================================
// 3. JOIN MEETING API (WITH STATUS CHECK)
// ==========================================
apiRouter.post('/meetings/join', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, userId } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Meeting code is required' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();

    const meeting = await prisma.meeting.findUnique({
      where: { code: cleanCode },
      include: {
        host: true,
        participants: { include: { user: true } },
        assignments: { include: { assignee: true, evidence: true } },
        transcripts: true,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: `Meeting with code ${cleanCode} not found` });
      return;
    }

    if (meeting.status === 'ENDED') {
      res.status(400).json({ error: 'This meeting has concluded and can no longer be joined.' });
      return;
    }

    if (meeting.status === 'WAITING') {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'ACTIVE', startedAt: new Date() },
      });
    }

    if (userId) {
      const existing = meeting.participants.find((p) => p.userId === userId);
      if (!existing) {
        await prisma.meetingParticipant.create({
          data: {
            meetingId: meeting.id,
            userId,
            role: 'Participant',
          },
        });
      }
    }

    const updatedMeeting = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        host: true,
        participants: { include: { user: true } },
        assignments: { include: { assignee: true, evidence: true } },
        transcripts: true,
      },
    });

    res.json({ message: 'Joined meeting successfully', meeting: updatedMeeting });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to join meeting' });
  }
});

// ==========================================
// 4. GET MEETING API & END MEETING
// ==========================================
apiRouter.get('/meetings/:idOrCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idOrCode } = req.params;

    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { code: idOrCode.toUpperCase() },
        ],
      },
      include: {
        host: true,
        participants: { include: { user: true } },
        assignments: { include: { assignee: true, assigner: true, evidence: true, editLogs: { include: { editedBy: true } } } },
        transcripts: true,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    res.json({ meeting });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch meeting' });
  }
});

apiRouter.get('/meetings', async (_req: Request, res: Response): Promise<void> => {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        host: true,
        participants: { include: { user: true } },
        assignments: true,
      },
    });

    res.json({ meetings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.patch('/meetings/:id/end', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { summary, decisions } = req.body;

    const existing = await prisma.meeting.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    const endedAt = new Date();

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        status: 'ENDED',
        endedAt,
        summary: summary || existing.summary,
        decisions: decisions ? JSON.stringify(decisions) : existing.decisions,
      },
      include: {
        host: true,
        participants: { include: { user: true } },
        assignments: { include: { assignee: true, evidence: true } },
      },
    });

    res.json({ message: 'Meeting ended successfully', meeting });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to end meeting' });
  }
});

// ==========================================
// 5. TRANSCRIPT STORAGE API (EN, HI, HINGLISH)
// ==========================================
apiRouter.post('/meetings/:id/transcripts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: idOrCode } = req.params;
    const { speaker, text, timestamp, language, isActionItem, actionTitle, actionAssignee, actionDeadline } = req.body;

    if (!speaker || !text) {
      res.status(400).json({ error: 'Speaker and text are required' });
      return;
    }

    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { code: idOrCode.toUpperCase() },
        ],
      },
    });

    const targetMeetingId = meeting ? meeting.id : idOrCode;

    const transcriptLine = await prisma.transcript.create({
      data: {
        meetingId: targetMeetingId,
        speaker,
        text,
        timestamp: timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: language || 'en', // "en" | "hi" | "hinglish"
        isActionItem: Boolean(isActionItem),
        actionTitle: actionTitle || null,
        actionAssignee: actionAssignee || null,
        actionDeadline: actionDeadline || null,
      },
    });

    res.status(201).json({ message: 'Transcript saved successfully', transcript: transcriptLine });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save transcript' });
  }
});

apiRouter.get('/meetings/:id/transcripts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: idOrCode } = req.params;
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { code: idOrCode.toUpperCase() },
        ],
      },
    });

    const targetMeetingId = meeting ? meeting.id : idOrCode;

    const transcripts = await prisma.transcript.findMany({
      where: { meetingId: targetMeetingId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ transcripts });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transcripts' });
  }
});

// ==========================================
// 6. AI ANALYSIS INGESTION API
// ==========================================
apiRouter.post('/meetings/:id/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: idOrCode } = req.params;
    const { hostId, analysisData } = req.body;

    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { code: idOrCode.toUpperCase() },
        ],
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    if (analysisData) {
      const createdAssignments = await processAIAnalysis(
        prisma,
        meeting.id,
        hostId || meeting.hostId,
        analysisData
      );
      res.json({
        message: 'AI Analysis processed successfully',
        assignmentsCreated: createdAssignments.length,
        assignments: createdAssignments,
      });
      return;
    }

    // Process actual meeting transcript using real Google Gemini API
    const result = await analyzeMeetingTranscriptWithGemini(
      prisma,
      meeting.id,
      hostId || meeting.hostId
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI Analysis processing failed' });
  }
});

// ==========================================
// 7. HOST EDITING API WITH AUDIT LOGS & NOTIFICATIONS
// ==========================================
apiRouter.patch('/assignments/:id/host-edit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { hostId, title, assigneeId, deadline, status, priority, evidenceRequired } = req.body;

    if (!hostId) {
      res.status(400).json({ error: 'hostId is required for host edit authorization' });
      return;
    }

    const hostUser = await prisma.user.findUnique({ where: { id: hostId } });
    if (!hostUser || hostUser.role !== 'host') {
      res.status(403).json({ error: 'Forbidden: Only Host users can perform assignment edits' });
      return;
    }

    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { assignee: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const edits: Array<{ fieldEdited: string; previousValue: string | null; newValue: string | null }> = [];

    if (title !== undefined && title !== existing.title) {
      edits.push({ fieldEdited: 'title', previousValue: existing.title, newValue: title });
    }
    if (assigneeId !== undefined && assigneeId !== existing.assigneeId) {
      edits.push({ fieldEdited: 'assigneeId', previousValue: existing.assigneeId, newValue: assigneeId });
    }
    if (deadline !== undefined && deadline !== existing.deadline) {
      edits.push({ fieldEdited: 'deadline', previousValue: existing.deadline, newValue: deadline });
    }
    if (status !== undefined && status !== existing.status) {
      edits.push({ fieldEdited: 'status', previousValue: existing.status, newValue: status });
    }

    // Update assignment in database
    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        assigneeId: assigneeId !== undefined ? assigneeId : existing.assigneeId,
        deadline: deadline !== undefined ? deadline : existing.deadline,
        status: status !== undefined ? status : existing.status,
        priority: priority !== undefined ? priority : existing.priority,
        evidenceRequired: evidenceRequired !== undefined ? evidenceRequired : existing.evidenceRequired,
      },
      include: {
        assignee: true,
        assigner: true,
        evidence: true,
        editLogs: { include: { editedBy: true } },
      },
    });

    // Save Edit History Audit Logs
    for (const edit of edits) {
      await prisma.assignmentEditLog.create({
        data: {
          assignmentId: id,
          editedById: hostId,
          fieldEdited: edit.fieldEdited,
          previousValue: edit.previousValue,
          newValue: edit.newValue,
        },
      });
    }

    // Create Notification for Affected Employee
    const targetUserId = updatedAssignment.assigneeId || existing.assigneeId;
    if (targetUserId && edits.length > 0) {
      const summaryEdits = edits.map((e) => `${e.fieldEdited} set to "${e.newValue}"`).join(', ');
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Assignment Updated by Host',
          message: `${hostUser.name} updated your assignment "${updatedAssignment.title}": ${summaryEdits}.`,
          type: 'assignment',
          targetRole: 'employee',
        },
      });
    }

    res.json({
      message: 'Assignment updated by Host successfully',
      assignment: updatedAssignment,
      logsCreated: edits.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Host assignment edit failed' });
  }
});

// ==========================================
// 8. GET ASSIGNMENTS & NOTIFICATIONS
// ==========================================
apiRouter.get('/assignments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { assigneeId } = req.query;

    const whereClause = assigneeId ? { assigneeId: String(assigneeId) } : {};

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: true,
        assigner: true,
        meeting: true,
        evidence: true,
        editLogs: { include: { editedBy: true } },
      },
    });

    res.json({ assignments });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch assignments' });
  }
});

apiRouter.post('/assignments/:id/evidence', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, url, notes, type, speaker, originalText, timestamp } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Evidence title is required' });
      return;
    }

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const evidence = await prisma.evidence.upsert({
      where: { assignmentId: id },
      update: {
        title,
        url: url || '',
        notes: notes || '',
        type: type || 'link',
        speaker: speaker || null,
        originalText: originalText || null,
        timestamp: timestamp || null,
        submittedAt: new Date(),
      },
      create: {
        assignmentId: id,
        title,
        url: url || '',
        notes: notes || '',
        type: type || 'link',
        speaker: speaker || null,
        originalText: originalText || null,
        timestamp: timestamp || null,
        submittedAt: new Date(),
      },
    });

    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: { status: 'submitted' },
      include: { assignee: true, assigner: true, evidence: true },
    });

    await prisma.notification.create({
      data: {
        title: 'Evidence Submitted',
        message: `Evidence submitted for "${assignment.title}".`,
        type: 'evidence',
        targetRole: 'host',
      },
    });

    res.json({ message: 'Evidence submitted successfully', evidence, assignment: updatedAssignment });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit evidence' });
  }
});

apiRouter.get('/notifications', async (_req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    res.json({ notifications });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
});

apiRouter.get('/users', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});
