import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DraftsService } from '../drafts/drafts.service';

export interface PublishJobData {
  draftId: string;
  userId: string;
}

@Processor('publish')
export class PublishingProcessor {
  private readonly logger = new Logger(PublishingProcessor.name);

  constructor(private draftsService: DraftsService) {}

  @Process()
  async handle(job: Job<PublishJobData>) {
    const { draftId, userId } = job.data;
    this.logger.log(`Executing scheduled publish — draft ${draftId} for user ${userId}`);
    try {
      await this.draftsService.publish(userId, draftId);
      this.logger.log(`Scheduled publish complete — draft ${draftId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Scheduled publish failed — draft ${draftId}: ${msg}`);
      throw err; // re-throw so Bull marks job as failed
    }
  }
}
