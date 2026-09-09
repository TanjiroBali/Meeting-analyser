import { PrismaClient } from '@prisma/client';

export interface AIAnalysisAssignmentItem {
  task: string;
  assignedTo: string | null; // Name of employee or null if unclear
  deadline: string | null;   // Deadline date or null if unclear
  confidence: number;        // AI confidence rating 0.0 - 1.0
  evidence: string;          // Original transcript quote proof
  speaker?: string;
  timestamp?: string;
}

export interface AIAnalysisStructuredResponse {
  assignments: AIAnalysisAssignmentItem[];
  technicalTopics: string[];
}

/**
 * Process and save AI Analysis structured response into database.
 * Rule: Never invent assignments. If employee or deadline is unclear,
 * keep assigneeId / deadline as null and mark status as 'needs_review'.
 */
export async function processAIAnalysis(
  prisma: PrismaClient,
  meetingId: string,
  hostId: string,
  structuredOutput: AIAnalysisStructuredResponse
) {
  const createdAssignments = [];
  const allUsers = await prisma.user.findMany();

  for (const item of structuredOutput.assignments) {
    if (!item.task || !item.task.trim()) {
      continue; // Skip invalid or empty items
    }

    // Match assigned employee by name
    let matchedUser = null;
    if (item.assignedTo) {
      const cleanName = item.assignedTo.trim().toLowerCase();
      matchedUser = allUsers.find(
        (u) =>
          u.name.toLowerCase().includes(cleanName) ||
          cleanName.includes(u.name.toLowerCase())
      );
    }

    const assigneeId = matchedUser ? matchedUser.id : null;
    const deadline = item.deadline ? item.deadline.trim() : null;
    const confidence = item.confidence ?? 1.0;

    // Flag for Host Review if assignee or deadline is unclear or confidence < 0.7
    const needsReview = !assigneeId || !deadline || confidence < 0.7;
    const status = needsReview ? 'needs_review' : 'todo';

    const assignment = await prisma.assignment.create({
      data: {
        meetingId,
        title: item.task.trim(),
        description: `Extracted from transcript discussion. Confidence: ${Math.round(confidence * 100)}%`,
        assigneeId,
        assignerId: hostId,
        deadline,
        priority: confidence > 0.85 ? 'high' : 'medium',
        status,
        confidence,
        evidenceRequired: 'Submitted implementation link or verified test proof',
        evidenceSnippet: item.evidence || null,
      },
      include: {
        assignee: true,
        assigner: true,
        meeting: true,
      },
    });

    // Store Evidence record containing original transcript quote & speaker
    await prisma.evidence.create({
      data: {
        assignmentId: assignment.id,
        speaker: item.speaker || (matchedUser ? matchedUser.name : 'Unknown Speaker'),
        originalText: item.evidence || 'Transcript excerpt',
        timestamp: item.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: `Evidence proof for: ${assignment.title}`,
        url: '',
        notes: item.evidence ? `Quote: "${item.evidence}"` : 'AI Extracted Evidence',
        type: 'transcript_quote',
      },
    });

    createdAssignments.push(assignment);
  }

  // Update meeting technical topics and summary
  if (structuredOutput.technicalTopics && structuredOutput.technicalTopics.length > 0) {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        decisions: JSON.stringify(structuredOutput.technicalTopics),
      },
    });
  }

  return createdAssignments;
}
