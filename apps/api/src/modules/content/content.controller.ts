import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContentService } from './content.service';

interface AuthUser { id: string }

interface GeneratePostDto {
  topic: string;
  trendId?: string;
  customContext?: string;
  contentType?: 'POST' | 'BLOG' | 'IMAGE';
}

@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private contentService: ContentService) {}

  @Post('generate')
  generate(@CurrentUser() user: AuthUser, @Body() dto: GeneratePostDto) {
    if (dto.contentType === 'IMAGE') return this.contentService.generateImagePost(user.id, dto);
    if (dto.contentType === 'BLOG') return this.contentService.generateBlog(user.id, dto);
    return this.contentService.generatePost(user.id, dto);
  }
}
