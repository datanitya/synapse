import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DraftStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService } from '../drafts/drafts.service';
import { PublishJobData } from './publishing.processor';

@Injectable()
export class PublishingService {
  constructor(
    @InjectQueue('publish') private publishQueue: Queue<PublishJobData>,
    private prisma: PrismaService,
    private draftsService: DraftsService,
  ) {}

  async schedulePublish(userId: string, draftId: string, scheduledAt: Date) {
    const draft = await this.draftsService.findOne(userId, draftId);

    if (draft.status === DraftStatus.PUBLISHED) {
      throw new ConflictException('Draft has already been published.');
    }
    if (!draft.finalContent?.trim()) {
      throw new BadRequestException('Select a variation or add content before scheduling.');
    }

    const delay = scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
      throw new BadRequestException('scheduledAt must be a future date.');
    }

    // Remove any pre-existing job for this draft (reschedule)
    const existingJob = await this.publishQueue.getJob(`publish:${draftId}`);
    if (existingJob) await existingJob.remove();

    await this.publishQueue.add(
      { draftId, userId },
      {
        jobId: `publish:${draftId}`,
        delay,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    );

    return this.prisma.draft.update({
      where: { id: draftId },
      data: {
        scheduledAt,
        status: DraftStatus.APPROVED,
      },
      include: { variations: { orderBy: { index: 'asc' } } },
    });
  }

  async cancelScheduledPublish(userId: string, draftId: string) {
    const draft = await this.draftsService.findOne(userId, draftId);

    if (draft.status === DraftStatus.PUBLISHED) {
      throw new ConflictException('Cannot cancel — draft is already published.');
    }
    if (!draft.scheduledAt) {
      throw new NotFoundException('No scheduled publish found for this draft.');
    }

    const job = await this.publishQueue.getJob(`publish:${draftId}`);
    if (job) await job.remove();

    return this.prisma.draft.update({
      where: { id: draftId },
      data: { scheduledAt: null, status: DraftStatus.DRAFT },
      include: { variations: { orderBy: { index: 'asc' } } },
    });
  }

  async getScheduledJobs() {
    const delayed = await this.publishQueue.getDelayed();
    return delayed.map((job) => ({
      jobId: job.id,
      draftId: job.data.draftId,
      userId: job.data.userId,
      scheduledAt: new Date(Date.now() + (job.opts.delay ?? 0)),
    }));
  }
}
