import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index, // Import Index
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Document } from '../../documents/entities/document.entity';

export enum IngestionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('ingestions')
export class Ingestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'documentId' })
  document!: Document;

  @Column()
  @Index()
  documentId!: string | number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'triggeredBy' })
  triggeredBy!: User;

  @Column()
  @Index()
  triggeredById!: string;

  @Column({
    type: 'enum',
    enum: IngestionStatus,
    default: IngestionStatus.PENDING,
  })
  @Index()
  status!: IngestionStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  options?: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
