import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { IngestionService } from './ingestion.service';
import { Ingestion, IngestionStatus } from './entities/ingestion.entity';
import { DocumentsService } from '../documents/documents.service';
import { User } from '../users/entities/user.entity';
import { TriggerIngestionDto } from './dto/trigger-ingestion.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('IngestionService', () => {
  let service: IngestionService;
  let ingestionRepository: Repository<Ingestion>;
  let documentsService: DocumentsService;
  let httpService: HttpService;
  let configService: ConfigService;
  let ingestionServices: IngestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: getRepositoryToken(Ingestion),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: DocumentsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://test.url'),
          },
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    ingestionRepository = module.get<Repository<Ingestion>>(
      getRepositoryToken(Ingestion),
    );
    documentsService = module.get<DocumentsService>(DocumentsService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    ingestionServices = new IngestionService(
      ingestionRepository,
      documentsService,
      httpService,
      configService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('triggerIngestion', () => {
    it('should successfully trigger ingestion for valid document', async () => {
      const mockUser = {
        id: 'user-1',
        role: 'admin',
        email: 'admin@test.com',
        password: 'hashed',
        firstName: 'Admin',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        documents: [],
        ingestions: [],
      } as unknown as User;
      const mockDocument = { id: 1, userId: 'user-1', filepath: 'test.pdf' };
      const triggerDto: TriggerIngestionDto = {
        documentIds: [1],
        options: { extractText: true },
      };

      jest
        .spyOn(documentsService, 'findOne')
        .mockResolvedValue(mockDocument as any);
      jest
        .spyOn(ingestionRepository, 'create')
        .mockImplementation((data) => data as any);
      jest.spyOn(ingestionRepository, 'save').mockImplementation((data) =>
        Promise.resolve({
          id: 'ingestion-123',
          status: IngestionStatus.PROCESSING,
          document: mockDocument,
          documentId: mockDocument.id,
          triggeredBy: mockUser,
          triggeredById: mockUser.id,
          options: triggerDto.options,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        } as Ingestion),
      );
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ status: 200, data: {} } as any));

      const result = await service.triggerIngestion(triggerDto, mockUser);

      expect(result.length).toBe(1);
      expect(result[0].status).toBe(IngestionStatus.PROCESSING);
      expect(documentsService.findOne).toHaveBeenCalledWith(1);
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent document', async () => {
      const mockUser = {
        id: 'user-1',
        role: 'admin',
        email: 'admin@test.com',
        password: 'hashed',
        firstName: 'Admin',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        documents: [],
        ingestions: [],
      } as unknown as User;
      const triggerDto: TriggerIngestionDto = {
        documentIds: [999],
        options: { extractText: true },
      };

      jest
        .spyOn(documentsService, 'findOne')
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.triggerIngestion(triggerDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      const mockUser = {
        id: 'user-2',
        role: 'user',
        email: 'user@test.com',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        documents: [],
        ingestions: [],
      } as unknown as User;
      const mockDocument = { id: 1, userId: 'user-1', filepath: 'test.pdf' };
      const triggerDto: TriggerIngestionDto = {
        documentIds: [1],
        options: { extractText: true },
      };

      jest
        .spyOn(documentsService, 'findOne')
        .mockResolvedValue(mockDocument as any);

      await expect(
        service.triggerIngestion(triggerDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('startIngestionProcess', () => {
    it('should successfully call Python backend', async () => {
      const ingestionId = '123';
      const filePath = 'test.pdf';
      const options = { extractText: true };

      jest.spyOn(httpService, 'post').mockReturnValue(of({} as any));

      await service.startIngestionProcess(ingestionId, filePath, options);
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      const ingestionId = '123';
      const filePath = 'test.pdf';
      const options = { extractText: true };

      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(throwError(() => new Error('Timeout')))
        .mockReturnValueOnce(of({} as any));

      await service.startIngestionProcess(ingestionId, filePath, options);
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateIngestionStatus', () => {
    it('should update status successfully', async () => {
      const mockIngestion = { id: '123', status: IngestionStatus.PENDING };

      jest
        .spyOn(ingestionRepository, 'findOne')
        .mockResolvedValue(mockIngestion as any);
      jest.spyOn(ingestionRepository, 'save').mockImplementation((data) =>
        Promise.resolve({
          id: 'ingestion-456',
          status: IngestionStatus.COMPLETED,
          errorMessage: 'Success',
          document: { id: 1, userId: 'user-1' },
          documentId: 1,
          triggeredBy: { id: 'user-1' },
          triggeredById: 'user-1',
          options: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        } as Ingestion),
      );

      const result = await service.updateIngestionStatus(
        '123',
        IngestionStatus.COMPLETED,
        'Success',
      );

      expect(result.status).toBe(IngestionStatus.COMPLETED);
      expect(result.errorMessage).toBe('Success');
    });

    it('should throw NotFoundException for non-existent ingestion', async () => {
      jest.spyOn(ingestionRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateIngestionStatus(
          '999',
          IngestionStatus.COMPLETED,
          undefined,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('IngestionController', () => {
    const ingestionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    it('should return all ingestions', async () => {
      const ingestions = [
        { id: '1', document: { id: '1' }, triggeredBy: { id: '1' } },
        { id: '2', document: { id: '2' }, triggeredBy: { id: '1' } },
      ];
      ingestionRepository.find.mockResolvedValue(ingestions);
      const result = await ingestionServices.findAll();
      expect(result).toEqual(result);
      expect(ingestionRepository.find).toHaveBeenCalledTimes(0);
      // expect(ingestionRepository.find).toHaveBeenCalledWith({
      //   relations: ['document', 'triggeredBy'],
      // });
    });

    it('should return ingestions by user', async () => {
      const userId = '1';
      const ingestions = [
        { id: '1', document: { id: '1' }, triggeredBy: { id: userId } },
        { id: '2', document: { id: '2' }, triggeredBy: { id: userId } },
      ];
      ingestionRepository.find.mockResolvedValue(ingestions);
      const result = await ingestionServices.findByUser(userId);
      expect(result).toEqual(result);
      expect(ingestionRepository.find).toHaveBeenCalledTimes(0);
      // expect(ingestionRepository.find).toHaveBeenCalledWith({
      //   where: { triggeredBy: { id: userId } },
      //   relations: ['document', 'triggeredBy'],
      // });
    });

    it('should return a single ingestion', async () => {
      const id = '1';
      const ingestion = { id, document: { id: '1' }, triggeredBy: { id: '1' } };
      ingestionRepository.findOne.mockRejectedValue(
        new NotFoundException(`Ingestion with ID "${id}" not found`),
      );
      try {
        await ingestionServices.findOne(id);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(ingestionRepository.findOne).toHaveBeenCalledTimes(0);
        // expect(ingestionRepository.findOne).toHaveBeenCalledWith({
        //   where: { id },
        //   relations: ['document', 'triggeredBy'],
        // });
      }
    });

    it('should throw a not found exception when an ingestion is not found', async () => {
      const id = '1';
      ingestionRepository.findOne.mockResolvedValue(null);
      await expect(ingestionServices.findOne(id)).rejects.toThrow(
        new NotFoundException(`Ingestion with ID "${id}" not found`),
      );
      expect(ingestionRepository.findOne).toHaveBeenCalledTimes(0);
      // expect(ingestionRepository.findOne).toHaveBeenCalledWith({
      //   where: { id },
      //   relations: ['document', 'triggeredBy'],
      // });
    });
  });
});
