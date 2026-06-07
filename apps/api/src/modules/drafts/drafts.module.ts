import { Module, forwardRef } from '@nestjs/common';
import { DraftsService } from './drafts.service';
import { DraftsController } from './drafts.controller';
import { PublishingModule } from '../publishing/publishing.module';

@Module({
  imports: [forwardRef(() => PublishingModule)],
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService],
})
export class DraftsModule {}
