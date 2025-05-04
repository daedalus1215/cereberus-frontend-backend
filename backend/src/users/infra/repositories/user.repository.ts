
import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly repository: Repository<User>
    ) {}

    async findByUsername(username: string): Promise<User | null> {
        return this.repository.findOne({ where: { username } });
    }

    async findById(id: string): Promise<User | null> {
        return this.repository.findOne({ where: { id: Number(id) } });
    }

    async create(user: Partial<User>): Promise<User> {
        const newUser = this.repository.create(user);
        return this.repository.save(newUser);
    }
} 