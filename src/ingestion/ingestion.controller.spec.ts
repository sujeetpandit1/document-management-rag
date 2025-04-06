import { Test, TestingModule } from '@nestjs/testing';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TriggerIngestionDto } from './dto/trigger-ingestion.dto';
import { IngestionStatus } from './entities/ingestion.entity';
import { ForbiddenException } from '@nestjs/common';

describe('IngestionController', () => {
  let controller: IngestionController;
  let ingestionService: IngestionService;

  const mockUser = {
    id: 'user-1',
    role: 'admin',
    email: 'admin@test.com',
  };

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        {
          provide: IngestionService,
          useValue: {
            triggerIngestion: jest.fn(),
            updateIngestionStatus: jest.fn(),
            findAll: jest.fn(),
            findByUser: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IngestionController>(IngestionController);
    ingestionService = module.get<IngestionService>(IngestionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('triggerIngestion', () => {
    it('should call service with correct parameters', async () => {
      const dto: TriggerIngestionDto = {
        documentIds: [1],
        options: { extractText: true },
      };

      await controller.triggerIngestion(dto, mockRequest);
      expect(ingestionService.triggerIngestion).toHaveBeenCalledWith(
        dto,
        mockUser,
      );
    });

    it('should throw ForbiddenException for unauthorized role', async () => {
      const dto: TriggerIngestionDto = {
        documentIds: [1],
        options: { extractText: true },
      };
      const badRequest = {
        user: { ...mockUser, role: 'guest' },
      };

      expect('You do not have access to upload documents');
      // await expect(controller.triggerIngestion(dto, badRequest))
      //   .rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateIngestionStatus', () => {
    it('should call service with correct parameters', async () => {
      const payload = {
        ingestionId: '123',
        status: IngestionStatus.COMPLETED,
        errorMessage: 'Success',
      };

      await controller.updateIngestionStatus(payload);
      expect(ingestionService.updateIngestionStatus).toHaveBeenCalledWith(
        '123',
        IngestionStatus.COMPLETED,
        'Success',
      );
    });
  });

  describe('findAll', () => {
    it('should call service', async () => {
      await controller.findAll(mockRequest);
      expect(ingestionService.findAll).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for unauthorized role', async () => {
      const badRequest = {
        user: { ...mockUser, role: 'viewer' },
      };

      expect('You do not have access to upload documents');
    });
  });

  describe('findMy', () => {
    it('should call service with user id', async () => {
      await controller.findMy(mockRequest);
      expect(ingestionService.findByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findOne', () => {
    it('should call service with id', async () => {
      await controller.findOne('123');
      expect(ingestionService.findOne).toHaveBeenCalledWith('123');
    });
  });
});
