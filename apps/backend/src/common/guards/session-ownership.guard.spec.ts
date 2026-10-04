import { ExecutionContext, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SessionOwnershipGuard } from './session-ownership.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('SessionOwnershipGuard', () => {
  let guard: SessionOwnershipGuard;
  let prisma: { session: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      session: {
        findUnique: jest.fn(),
      },
    };
    guard = new SessionOwnershipGuard(prisma as unknown as PrismaService);
  });

  function createMockContext(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('throws UnauthorizedException if no authenticated user', async () => {
    const ctx = createMockContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('allows access if no sessionId parameter is present', async () => {
    const ctx = createMockContext({
      user: { userId: 'user-1' },
      params: {},
    });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('throws NotFoundException if session does not exist', async () => {
    prisma.session.findUnique.mockResolvedValue(null);
    const ctx = createMockContext({
      user: { userId: 'user-1' },
      params: { id: 'session-nonexistent' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException if session belongs to a different user (IDOR attempt)', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-123',
      mentorId: 'user-victim',
    });

    const ctx = createMockContext({
      user: { userId: 'user-attacker', role: 'user' },
      params: { id: 'session-123' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows access if session belongs to the authenticated user', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-123',
      mentorId: 'user-legit',
    });

    const req: any = {
      user: { userId: 'user-legit', role: 'user' },
      params: { id: 'session-123' },
    };
    const ctx = createMockContext(req);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.sessionData).toHaveProperty('id', 'session-123');
  });

  it('allows access if user has admin role even if not owner', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-123',
      mentorId: 'user-regular',
    });

    const ctx = createMockContext({
      user: { userId: 'admin-1', role: 'admin' },
      params: { id: 'session-123' },
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
