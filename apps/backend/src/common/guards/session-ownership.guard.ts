import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || (!user.userId && !user.sub && !user.id)) {
      throw new UnauthorizedException('Authentication required');
    }

    const currentUserId = user.userId || user.sub || user.id;

    const sessionId =
      request.params?.id ||
      request.params?.sessionId ||
      request.body?.sessionId ||
      request.query?.sessionId;

    // If endpoint doesn't target a specific session, proceed
    if (!sessionId) {
      return true;
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, mentorId: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.mentorId !== currentUserId && user.role !== 'admin') {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view or manage this session',
      );
    }

    // Attach verified session to request object
    request.sessionData = session;
    return true;
  }
}
