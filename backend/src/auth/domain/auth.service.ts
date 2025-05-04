import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/domain/users.service';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/domain/entities/user.entity';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService
    ) { }

    async validateUser(username: string, password: string): Promise<Omit<User, 'password'> | null> {
        const user = await this.usersService.findByUsername(username);
        if (user && await bcrypt.compare(password, user.password)) {
            // If the user is found and the password matches, return the user object without the password
            const { password: _, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: Omit<User, 'password'>) {
        const payload = { username: user.username, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
