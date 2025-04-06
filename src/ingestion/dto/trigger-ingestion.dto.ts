import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IngestionOptionsDto } from './ingestion-options.dto';

export class TriggerIngestionDto {
  @IsArray()
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  documentIds: number[];

  @ValidateNested()
  @Type(() => IngestionOptionsDto)
  options?: IngestionOptionsDto;
}
