import { PartialType } from '@nestjs/mapped-types';
import { TriggerIngestionDto } from './trigger-ingestion.dto';

export class UpdateIngestionDto extends PartialType(TriggerIngestionDto) {}
