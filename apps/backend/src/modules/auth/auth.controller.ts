import { Controller, Post, Body, UseGuards, Get, Request, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Throttle({ short: { limit: 5, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: LoginDto) {
        const validUser = await this.authService.validateUser(body.email, body.password);
        if (!validUser) {
            throw new UnauthorizedException('Invalid email or password');
        }
        return this.authService.login(validUser);
    }

    @Post('register')
    async register(@Body() body: RegisterDto) {
        return this.authService.register(body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getProfile(@Request() req: any) {
        return req.user;
    }
}
