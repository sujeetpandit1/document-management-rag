import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IngestionOptionsDto } from './dto/ingestion-options.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Ingestion, IngestionStatus } from './entities/ingestion.entity';
import { TriggerIngestionDto } from './dto/trigger-ingestion.dto';
import { DocumentsService } from '../documents/documents.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class IngestionService {
  private readonly pythonBackendUrl: any;

  constructor(
    @InjectRepository(Ingestion)
    private ingestionRepository: Repository<Ingestion>,
    private documentsService: DocumentsService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.pythonBackendUrl = this.configService.get<string>('BACKEND_URL');
  }

  async triggerIngestion(
    triggerIngestionDto: TriggerIngestionDto,
    user: User,
  ): Promise<Ingestion[]> {
    const { documentIds, options } = triggerIngestionDto;
    const results: Ingestion[] = [];

    for (const documentId of documentIds) {
      // Validate document exists and belongs to user
      let document;
      try {
        document = await this.documentsService.findOne(documentId);
        if (!document) {
          throw new NotFoundException(
            `Document with ID "${documentId}" not found`,
          );
        }
        if (document.userId !== user.id && user.role !== 'admin') {
          throw new ForbiddenException(
            'You do not have permission to ingest this document',
          );
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new NotFoundException(
          `Error validating document: ${error.message}`,
        );
      }

      // Create ingestion record
      const ingestion = this.ingestionRepository.create({
        document,
        documentId,
        triggeredBy: user,
        triggeredById: user.id,
        status: IngestionStatus.PENDING,
        options: options, // Store ingestion options
      });

      const savedIngestion = await this.ingestionRepository.save(ingestion);

      // Call Python backend to start ingestion
      try {
        await this.startIngestionProcess(
          savedIngestion.id,
          document.filepath,
          options,
        );

        // Update status to processing
        savedIngestion.status = IngestionStatus.PROCESSING;
        results.push(await this.ingestionRepository.save(savedIngestion));
      } catch (error) {
        // Update status to failed
        savedIngestion.status = IngestionStatus.FAILED;
        savedIngestion.errorMessage = error.message;
        results.push(await this.ingestionRepository.save(savedIngestion));
      }
    }

    return results;
  }

  async startIngestionProcess(
    ingestionId: string,
    filePath: string,
    options?: IngestionOptionsDto,
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
  ): Promise<void> {
    const payload = {
      ingestionId,
      filePath,
      callbackUrl: `${this.configService.get<string>('BACKEND_URL')}/ingestion/callback`,
      options: {
        extractText: options?.extractText,
        generateEmbeddings: options?.generateEmbeddings,
        priority: options?.priority,
      },
    };

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await firstValueFrom(
          this.httpService.post(`${this.pythonBackendUrl}/ingest`, payload, {
            timeout,
          }),
        );
        return; // Success - exit the function
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff
        }
      }
    }
    throw lastError; // All retries failed
  }

  async updateIngestionStatus(
    ingestionId: string,
    status: IngestionStatus,
    errorMessage?: string,
  ): Promise<Ingestion> {
    const ingestion = await this.ingestionRepository.findOne({
      where: { id: ingestionId },
    });

    if (!ingestion) {
      throw new NotFoundException(
        `Ingestion with ID "${ingestionId}" not found`,
      );
    }

    ingestion.status = status;

    if (errorMessage) {
      ingestion.errorMessage = errorMessage;
    }

    return this.ingestionRepository.save(ingestion);
  }

  async findAll(): Promise<Ingestion[]> {
    return this.ingestionRepository.find({
      relations: ['document', 'triggeredBy'],
    });
  }

  async findByUser(userId: string): Promise<Ingestion[]> {
    return this.ingestionRepository.find({
      where: { triggeredBy: { id: userId } },
      relations: ['document', 'triggeredBy'],
    });
  }

  async findOne(id: string): Promise<Ingestion> {
    const ingestion = await this.ingestionRepository.findOne({
      where: { id },
      relations: ['document', 'triggeredBy'],
    });

    if (!ingestion) {
      throw new NotFoundException(`Ingestion with ID "${id}" not found`);
    }

    return ingestion;
  }
}
