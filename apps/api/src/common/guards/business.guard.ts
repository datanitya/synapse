import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BusinessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { id: string } | undefined;
    if (!user) throw new ForbiddenException('Not authenticated');

    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { plan: true },
    });

    if (fullUser?.plan?.tier !== 'BUSINESS') {
      throw new ForbiddenException('Developer API access requires the BUSINESS plan');
    }

    return true;
  }
}
