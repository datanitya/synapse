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
      isActive: true,
      features: [
        'Trends feed (HackerNews + Google News)',
        '~10 posts per month',
        'Drafts & content bank',
        'Brand DNA learning',
        'LinkedIn login',
      ],
    },
    {
      tier: 'PRO' as const,
      displayName: 'Pro',
      monthlyTokenLimit: 500_000,
      priceInr: 499,
      currency: 'INR',
      isActive: true,
      features: [
        '500,000 tokens / month (~100 posts)',
        'Scheduled auto-publish to LinkedIn',
        'Opportunity Score on every trend',
        'Brand Score + Voice Report',
        'Image generation',
        'All AI providers (GPT-4o, Claude, Gemini)',
      ],
    },
    {
      tier: 'BUSINESS' as const,
      displayName: 'Business',
      monthlyTokenLimit: 0,
      priceInr: 1499,
      currency: 'INR',
      isActive: true,
      features: [
        'Unlimited tokens',
        'Everything in Pro',
        'Developer API access',
        'Team accounts (5 seats)',
        'Post analytics (impressions, likes)',
        'Priority support',
      ],
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
        isActive: plan.isActive,
        features: plan.features,
      },
      create: plan,
    });
    const tokens = plan.monthlyTokenLimit === 0 ? 'unlimited' : plan.monthlyTokenLimit.toLocaleString();
    console.log(`  ✓ ${plan.displayName} (₹${plan.priceInr}/mo · ${tokens} tokens)`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
