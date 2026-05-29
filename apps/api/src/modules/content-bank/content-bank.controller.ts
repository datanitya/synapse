import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ContentType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContentBankService } from './content-bank.service';
import { CreateContentBankItemDto } from './dto/create-content-bank-item.dto';
import { UpdateContentBankItemDto } from './dto/update-content-bank-item.dto';

interface AuthUser { id: string }

@Controller('content-bank')
@UseGuards(JwtAuthGuard)
export class ContentBankController {
  constructor(private contentBankService: ContentBankService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('contentType') contentType?: ContentType,
  ) {
    return this.contentBankService.findAll(user.id, contentType);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContentBankItemDto) {
    return this.contentBankService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contentBankService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateContentBankItemDto,
  ) {
    return this.contentBankService.update(user.id, id, dto);
  }

  @Delete(':id')
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contentBankService.archive(user.id, id);
  }
}
