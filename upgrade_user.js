const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'swathikota2000@gmail.com';
  const user = await prisma.user.findUnique({where: {email}});
  if(!user) return;
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier: 'PRO',
      razorpaySubscriptionId: 'manual_upgrade3',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDaysFromNow
    },
    update: {
      tier: 'PRO',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDaysFromNow
    }
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionTier: 'PRO' }
  });
  console.log('Upgraded ' + email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
