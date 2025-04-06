import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class IngestionOptionsDto {
  @IsOptional()
  @IsBoolean()
  extractText?: boolean;

  @IsOptional()
  @IsBoolean()
  generateEmbeddings?: boolean;

  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high';
}
