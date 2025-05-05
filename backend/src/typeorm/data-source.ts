import { DataSource } from 'typeorm';
import { User } from '../users/domain/entities/user.entity';
import * as path from 'path';

const AppDataSource = new DataSource({
    type: 'sqlite',
    database: path.join(__dirname, '../../db.sqlite'),
    entities: [User],
    migrations: ['src/typeorm/migrations/*.ts'],
    synchronize: false,
    logging: true
});

export default AppDataSource; 