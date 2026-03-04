import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseEntity {
    @ApiProperty({
        example: 'uuid-string',
        description: 'Unique identifier',
    })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ description: 'Creation date' })
    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @ApiProperty({ description: 'Deletion date (soft delete)' })
    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
