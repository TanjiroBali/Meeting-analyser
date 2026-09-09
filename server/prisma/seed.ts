import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning Anymit database tables...');

  // Clean existing tables for a fresh database start
  await prisma.assignmentEditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();

  console.log('✨ Anymit database reset successfully! The app is ready for real user accounts and real meetings.');
}

main()
  .catch((e) => {
    console.error('❌ Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
