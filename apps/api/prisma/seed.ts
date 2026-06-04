import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      tier: 'FREE' as const,
      displayName: 'Free',
      monthlyTokenLimit: 50_000,
      priceInr: 0,
      currency: 'INR',
      features: ['Trends feed', '~10 posts/month', 'Drafts', 'Content bank'],
    },
    {
      tier: 'PRO' as const,
      displayName: 'Creator',
      monthlyTokenLimit: 500_000,
      priceInr: 299,
      currency: 'INR',
      features: ['Unlimited posts', 'All content types', 'Content calendar', 'Posting reminders', 'All AI models'],
    },
    {
      tier: 'BUSINESS' as const,
      displayName: 'Pro',
      monthlyTokenLimit: 0,
      priceInr: 999,
      currency: 'INR',
      features: ['Unlimited tokens', 'Image generation', 'Priority support', 'Advanced trend filters', 'Everything in Creator'],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: {
        displayName: plan.displayName,
        monthlyTokenLimit: plan.monthlyTokenLimit,
        priceInr: plan.priceInr,
        currency: plan.currency,
        features: plan.features,
      },
      create: plan,
    });
  }

  console.log('Plans seeded (INR pricing).');
}

main().catch(console.error).finally(() => prisma.$disconnect());
