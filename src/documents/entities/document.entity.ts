import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { IsNotEmpty } from 'class-validator';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @IsNotEmpty()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  language: string;

  @Column()
  filename: string;

  @Column()
  filepath: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  @ManyToOne(() => User, user => user.documents)
  uploadedBy: User; @Column({ default: false })

  isProcessed: boolean;
  userId: string;
}