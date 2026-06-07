import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';
import { ImagesService } from './images.service';
import { GenerateImageDto } from './dto/generate-image.dto';

interface AuthUser { id: string }

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(
    private aiService: AiService,
    private imagesService: ImagesService,
  ) {}

  @Post('generate')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateImageDto) {
    const buffer = await this.aiService.generateImage(dto.prompt, user.id);
    const imageUrl = await this.imagesService.uploadBuffer(buffer, user.id);
    return { imageUrl };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
        }
      },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const imageUrl = await this.imagesService.uploadBuffer(file.buffer, user.id);
    return { imageUrl };
  }
}
