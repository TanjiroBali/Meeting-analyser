import { PrismaClient } from '@prisma/client';

/**
 * Generates a unique 4-letter uppercase meeting code (e.g., "ABCD").
 * Checks database for collisions and retries if a collision occurs.
 */
export async function generateUniqueMeetingCode(prisma: PrismaClient): Promise<string> {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      const randomIndex = Math.floor(Math.random() * letters.length);
      code += letters[randomIndex];
    }

    // Collision check against database @unique constraint
    const existing = await prisma.meeting.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Failed to generate a unique 4-letter meeting code after multiple attempts');
}
