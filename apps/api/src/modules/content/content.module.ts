import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { AiModule } from '../ai/ai.module';
import { ImagesModule } from '../images/images.module';
import { BrandMemoryModule } from '../brand-memory/brand-memory.module';

@Module({
  imports: [AiModule, ImagesModule, BrandMemoryModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
