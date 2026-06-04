import { Body, Controller, Post } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

@Controller('waitlist')
export class WaitlistController {
  constructor(private waitlistService: WaitlistService) {}

  @Post()
  join(@Body() dto: JoinWaitlistDto) {
    return this.waitlistService.join(dto);
  }
}
