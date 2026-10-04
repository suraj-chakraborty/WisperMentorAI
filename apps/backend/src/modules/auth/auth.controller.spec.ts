import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { validateUser: jest.Mock; login: jest.Mock; register: jest.Mock };

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('returns access_token and user info for valid credentials', async () => {
      const mockUser = { id: 'u1', email: 'test@example.com', role: 'user' };
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({
        access_token: 'valid_jwt_token',
        user: mockUser,
      });

      const result = await controller.login({
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'ValidPassword123!',
      );
      expect(result).toHaveProperty('access_token', 'valid_jwt_token');
    });

    it('throws UnauthorizedException (401) for invalid credentials', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        controller.login({
          email: 'wrong@example.com',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('delegates to authService.register', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'SecurePassword123!',
        name: 'New User',
      };
      authService.register.mockResolvedValue({
        access_token: 'new_token',
        user: { id: 'u2', email: registerDto.email },
      });

      const result = await controller.register(registerDto);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toHaveProperty('access_token', 'new_token');
    });
  });

  describe('security & rate limiting', () => {
    it('has rate limiting configured on AuthController with short and medium limits', () => {
      const shortLimit = Reflect.getMetadata('THROTTLER:LIMITshort', AuthController);
      const shortTtl = Reflect.getMetadata('THROTTLER:TTLshort', AuthController);
      const mediumLimit = Reflect.getMetadata('THROTTLER:LIMITmedium', AuthController);
      const mediumTtl = Reflect.getMetadata('THROTTLER:TTLmedium', AuthController);

      expect(shortLimit).toBe(5);
      expect(shortTtl).toBe(1000);
      expect(mediumLimit).toBe(10);
      expect(mediumTtl).toBe(60000);
    });
  });
});

