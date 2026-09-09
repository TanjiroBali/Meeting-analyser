import { PrismaClient } from '@prisma/client';
import { processAIAnalysis, AIAnalysisStructuredResponse } from './aiAnalysisService';

/**
 * Service to perform real AI analysis of meeting transcripts using Google Gemini 2.5 Flash API.
 */
export async function analyzeMeetingTranscriptWithGemini(
  prisma: PrismaClient,
  meetingId: string,
  hostId: string
) {
  // 1. Fetch meeting and associated transcripts from database
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      transcripts: { orderBy: { createdAt: 'asc' } },
      host: true,
    },
  });

  if (!meeting) {
    throw new Error(`Meeting with ID ${meetingId} not found.`);
  }

  const transcripts = meeting.transcripts;
  const totalTranscriptText = transcripts.map((t) => t.text).join(' ').trim();

  if (!transcripts || transcripts.length === 0 || totalTranscriptText.length < 15) {
    return {
      message: 'No analysis available for this meeting.',
      assignmentsCreated: 0,
      assignments: [],
      technicalTopics: [],
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      'GEMINI_API_KEY is not configured in server/.env. Please set a valid Gemini API key in server/.env to run real AI analysis.'
    );
  }

  // 2. Fetch active team members to provide context for task assignees
  const users = await prisma.user.findMany();
  const teamContext = users
    .map((u) => `- ${u.name} (ID: ${u.id}, Role: ${u.title || u.role})`)
    .join('\n');

  // 3. Format actual meeting transcript text
  const transcriptText = transcripts
    .map((t) => `[${t.timestamp || 'N/A'}] ${t.speaker}: ${t.text}`)
    .join('\n');

  // 4. Construct Gemini prompt enforcing zero-hallucination and multi-lingual processing
  const prompt = `
You are an expert AI meeting assistant for Anymit, a platform that converts live meeting discussions into tracked work assignments, deadlines, and evidence proofs.

### Available Team Members (Assignee Candidates):
${teamContext}

### Actual Live Meeting Transcript (Supports English, Hindi, Hinglish):
${transcriptText}

### Instructions:
1. Carefully analyze the meeting transcript above.
2. Extract all distinct action items / work assignments explicitly or implicitly discussed in the conversation.
3. For each assignment:
   - "task": Clear description of the task.
   - "assignedTo": Name of the assigned employee (must match one of the available team members if mentioned/implied, or NULL if unassigned/unclear).
   - "deadline": Target date (e.g. YYYY-MM-DD or relative phrase like "by Friday" / "in 3 days" / NULL if unmentioned).
   - "confidence": A float rating from 0.0 to 1.0 representing how confident you are in the task description, assignee, and deadline accuracy.
   - "evidence": The EXACT quote from the transcript where this task was discussed or agreed upon (in English, Hindi, or Hinglish).
   - "speaker": The name of the person who mentioned or agreed to the task.
   - "timestamp": The timestamp from the transcript line.
4. Extract key "technicalTopics" or decisions discussed during the meeting as a list of strings.
5. ZERO HALLUCINATION RULE: Do NOT invent tasks, assignees, or deadlines that were not discussed. If an assignee or deadline is missing or ambiguous, set assignedTo or deadline to null and lower the confidence rating (< 0.7).
`.trim();

  // 5. Call Google Gemini API with fallback across model versions
  const models = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-pro',
    'gemini-pro-latest',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
  ];
  let lastError = '';
  let responseData = null;

  const requestBody = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: {
          assignments: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                task: { type: 'STRING' },
                assignedTo: { type: 'STRING', nullable: true },
                deadline: { type: 'STRING', nullable: true },
                confidence: { type: 'NUMBER' },
                evidence: { type: 'STRING' },
                speaker: { type: 'STRING' },
                timestamp: { type: 'STRING' },
              },
              required: ['task', 'confidence', 'evidence'],
            },
          },
          technicalTopics: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['assignments', 'technicalTopics'],
      },
    },
  });

  for (const model of models) {
    try {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      if (res.ok) {
        responseData = await res.json();
        break;
      } else {
        lastError = await res.text();
      }
    } catch (err: any) {
      lastError = err.message;
    }
  }

  if (!responseData) {
    throw new Error(`Gemini API call failed across models: ${lastError}`);
  }

  let rawJsonText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawJsonText) {
    throw new Error('Gemini API returned an empty or invalid candidate response.');
  }

  // Strip markdown code fence wrappers if present (e.g. ```json ... ```)
  rawJsonText = rawJsonText.trim();
  if (rawJsonText.startsWith('```')) {
    rawJsonText = rawJsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  const structuredData: AIAnalysisStructuredResponse = JSON.parse(rawJsonText);

  // 6. Save extracted assignments and evidence proof into PostgreSQL database
  const createdAssignments = await processAIAnalysis(
    prisma,
    meetingId,
    hostId || meeting.hostId,
    structuredData
  );

  return {
    message: 'Real Gemini AI Analysis completed successfully',
    assignmentsCreated: createdAssignments.length,
    assignments: createdAssignments,
    technicalTopics: structuredData.technicalTopics || [],
  };
}
