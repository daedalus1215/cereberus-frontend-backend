import { DataSource } from 'typeorm';
import { User } from '../users/domain/entities/user.entity';
import { Note } from 'src/notes/domain/entities/notes/note.entity';
import { Memo } from 'src/notes/domain/entities/notes/memo.entity';
import { Tag } from 'src/notes/domain/entities/tag/tag.entity';
import { TagNote } from 'src/notes/domain/entities/tag/tag-note.entity';
import { TimeTrack } from 'src/time-tracks/domain/entities/time-track-entity/time-track.entity';
import * as path from 'path';

const AppDataSource = new DataSource({
    type: 'sqlite',
    database: path.join(__dirname, '../../db.sqlite'),
    entities: [User, Note, Memo, Tag, TagNote, TimeTrack],
    migrations: ['src/typeorm/migrations/*.ts'],
    synchronize: false,
    logging: true
});

export default AppDataSource; 