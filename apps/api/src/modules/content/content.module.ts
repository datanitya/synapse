import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { AiModule } from '../ai/ai.module';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [AiModule, ImagesModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
