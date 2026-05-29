import { Module } from '@nestjs/common';
import { DraftsModule } from '../drafts/drafts.module';
import { ContentBankController } from './content-bank.controller';
import { ContentBankService } from './content-bank.service';

@Module({
  imports: [DraftsModule],
  controllers: [ContentBankController],
  providers: [ContentBankService],
})
export class ContentBankModule {}
