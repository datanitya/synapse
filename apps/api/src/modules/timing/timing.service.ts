import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DayOfWeek } from '@prisma/client';

interface TimeSlotConfig {
  hour: number;
  score: number;
}

const TIMING_HEURISTICS: Record<DayOfWeek, TimeSlotConfig[]> = {
  MONDAY: [
    { hour: 8, score: 85 },
    { hour: 12, score: 72 },
    { hour: 17, score: 68 },
  ],
  TUESDAY: [
    { hour: 8, score: 92 },
    { hour: 10, score: 88 },
    { hour: 17, score: 75 },
  ],
  WEDNESDAY: [
    { hour: 8, score: 90 },
    { hour: 12, score: 85 },
    { hour: 17, score: 78 },
  ],
  THURSDAY: [
    { hour: 8, score: 88 },
    { hour: 10, score: 82 },
    { hour: 14, score: 70 },
  ],
  FRIDAY: [
    { hour: 8, score: 75 },
    { hour: 11, score: 70 },
    { hour: 14, score: 60 },
  ],
  SATURDAY: [
    { hour: 9, score: 45 },
    { hour: 12, score: 42 },
  ],
  SUNDAY: [
    { hour: 18, score: 50 },
    { hour: 20, score: 48 },
  ],
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

const JS_DAY_TO_ENUM: DayOfWeek[] = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
];

@Injectable()
export class TimingService {
  constructor(private prisma: PrismaService) {}

  async getRecommendations(userId: string) {
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
      select: { preferredDays: true, timezone: true },
    });

    const preferredDays = prefs?.preferredDays ?? Object.keys(TIMING_HEURISTICS) as DayOfWeek[];

    const slots: Array<{ datetime: string; score: number; label: string }> = [];
    const now = new Date();

    for (let daysAhead = 0; daysAhead <= 7 && slots.length < 6; daysAhead++) {
      const date = new Date(now);
      date.setDate(date.getDate() + daysAhead);

      const dayEnum = JS_DAY_TO_ENUM[date.getDay()];
      if (!preferredDays.includes(dayEnum)) continue;

      const daySlots = TIMING_HEURISTICS[dayEnum] ?? [];

      for (const slot of daySlots) {
        const slotDate = new Date(date);
        slotDate.setHours(slot.hour, 0, 0, 0);

        if (slotDate <= now) continue;

        const label = this.buildLabel(dayEnum, slot.hour, slot.score);
        slots.push({
          datetime: slotDate.toISOString(),
          score: slot.score,
          label,
        });
      }
    }

    slots.sort((a, b) => b.score - a.score);
    return { slots: slots.slice(0, 3) };
  }

  private buildLabel(day: DayOfWeek, hour: number, score: number): string {
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const quality = score >= 88 ? 'peak' : score >= 75 ? 'high' : 'moderate';
    return `${DAY_LABELS[day]} ${period} — ${quality} B2B engagement`;
  }
}
