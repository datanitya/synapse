import { Module } from '@nestjs/common';
import { TimingService } from './timing.service';
import { TimingController } from './timing.controller';

@Module({
  controllers: [TimingController],
  providers: [TimingService],
})
export class TimingModule {}
