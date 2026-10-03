import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() body: any) {
        // In a real app, use LocalAuthGuard to validate first, 
        // but for simplicity we'll validate manually or use the service
        const validUser = await this.authService.validateUser(body.email, body.password);
        if (!validUser) {
            return { error: 'Invalid credentials' };
        }
        return this.authService.login(validUser);
    }

    @Post('register')
    async register(@Body() body: any) {
        return this.authService.register(body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getProfile(@Request() req: any) {
        return req.user;
    }
}
