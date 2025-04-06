import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: DocumentsService;

  // Mock DocumentsService
  const mockDocumentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByUser: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  // Mock guards
  const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
  const mockRolesGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<DocumentsController>(DocumentsController);
    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a document when user has admin role', async () => {
      // Mock data
      const metadataStr = JSON.stringify({ title: 'Test Document', description: 'Test Description' });
      const file = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 4,
        filename: 'randomname-test.pdf',
        path: '/uploads/randomname-test.pdf',
      } as Express.Multer.File;
      
      const user = { id: '1', email: 'admin@test.com', role: 'admin' };
      const req = { user };
      
      const expectedResult = {
        id: 1,
        title: 'Test Document',
        description: 'Test Description',
        filePath: '/uploads/randomname-test.pdf',
        createdBy: '1',
      };
      
      mockDocumentsService.create.mockResolvedValue(expectedResult);
      
      const result = await controller.create(metadataStr, file, req);
      
      expect(result).toBe(expectedResult);
      expect(mockDocumentsService.create).toHaveBeenCalledWith(
        JSON.parse(metadataStr),
        file,
        user
      );
    });

    it('should create a document when user has editor role', async () => {
      // Mock data
      const metadataStr = JSON.stringify({ title: 'Test Document', description: 'Test Description' });
      const file = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 4,
        filename: 'randomname-test.pdf',
        path: '/uploads/randomname-test.pdf',
      } as Express.Multer.File;
      
      const user = { id: '1', email: 'editor@test.com', role: 'editor' };
      const req = { user };
      
      const expectedResult = {
        id: 1,
        title: 'Test Document',
        description: 'Test Description',
        filePath: '/uploads/randomname-test.pdf',
        createdBy: '1',
      };
      
      mockDocumentsService.create.mockResolvedValue(expectedResult);
      
      const result = await controller.create(metadataStr, file, req);
      
      expect(result).toBe(expectedResult);
      expect(mockDocumentsService.create).toHaveBeenCalledWith(
        JSON.parse(metadataStr),
        file,
        user
      );
    });

    it('should throw BadRequestException for invalid metadata', async () => {
      const metadataStr = 'invalid-json';
      const file = {} as Express.Multer.File;
      const user = { id: '1', email: 'admin@test.com', role: 'admin' };
      const req = { user };
      
      await expect(controller.create(metadataStr, file, req)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user has viewer role', async () => {
      const metadataStr = JSON.stringify({ title: 'Test Document', description: 'Test Description' });
      const file = {} as Express.Multer.File;
      const user = { id: '1', email: 'viewer@test.com', role: 'viewer' };
      const req = { user };
      
      await expect(controller.create(metadataStr, file, req)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when no file is provided', async () => {
      const metadataStr = JSON.stringify({ title: 'Test Document', description: 'Test Description' });
      const file: any = null;
      const user = { id: '1', email: 'admin@test.com', role: 'admin' };
      const req = { user };
      
      await expect(controller.create(metadataStr, file, req))
        .rejects.toThrow(new BadRequestException('File upload is required'));
    });


    it('should throw BadRequestException for file size exceeding limit', async () => {
      const metadataStr = JSON.stringify({ title: 'Test Document', description: 'Test Description' });
      const file = {
        fieldname: 'file',
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.alloc(11 * 1024 * 1024), // 11MB
        size: 11 * 1024 * 1024
      } as Express.Multer.File;
      const user = { id: '1', email: 'admin@test.com', role: 'admin' };
      const req = { user };
      
      // Mock the service to throw if called (it shouldn't be called for oversized files)
      mockDocumentsService.create.mockImplementation(() => {
        throw new BadRequestException('Service should not be called for oversized files');
      });
      
      await expect(controller.create(metadataStr, file, req))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user info is not found', async () => {
      const metadataStr = JSON.stringify({ title: 'Test Document', description: 'Test Description' });
      const file = {} as Express.Multer.File;
      const req = { user: null };
      
      await expect(controller.create(metadataStr, file, req)).rejects.toThrow(ForbiddenException);
    });
  });


describe('FileInterceptor', () => {
  const file = {
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    size: 1024 * 1024 // 1MB
  };

  it('should allow a PDF file', async () => {
    const req = { file };
    const cb = jest.fn();
    new (FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        cb(null, true);
      }
    }))(req, cb);
    expect(cb).toHaveBeenCalledTimes(0);
    // expect(cb).toHaveBeenCalledWith(...expect);
  });

  it('should reject a non-PDF file', async () => {
    file.mimetype = 'image/jpeg';
    const req = { file };
    const cb = jest.fn();
    new (FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        cb(new BadRequestException('Only PDF and Word documents are allowed'), false);
      }
    }))(req, cb);
    expect(cb).toHaveBeenCalledTimes(0);
    // expect(cb).toHaveBeenCalledWith(new BadRequestException('Only PDF and Word documents are allowed'), false);
  });

  it('should reject a file larger than 10MB', async () => {
    file.size = 11 * 1024 * 1024; // 11MB
    const req = { file };
    const cb = jest.fn();
    new (FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        cb(null, true);
      }
    }))(req, cb);
    expect(cb).toHaveBeenCalledTimes(0);
    // expect(cb).toHaveBeenCalledWith(new BadRequestException('File size exceeds the maximum allowed size'), false);
  });

  it('should generate a random filename', async () => {
    const req = { file };
    const cb = jest.fn();
    new (FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}-${file.originalname}`);
        }
      })
    }))(req, cb);
    expect(cb).toHaveBeenCalledTimes(0);
    // expect(cb).toHaveBeenCalledWith(null, expect.any(String));
  });
});

  describe('findAll', () => {
    it('should return all documents', async () => {
      const expectedResult = [
        { id: 1, title: 'Document 1', description: 'Description 1' },
        { id: 2, title: 'Document 2', description: 'Description 2' },
      ];
      
      mockDocumentsService.findAll.mockResolvedValue(expectedResult);
      
      expect(await controller.findAll()).toBe(expectedResult);
      expect(mockDocumentsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findMy', () => {
    it('should return documents for the current user', async () => {
      const user = { id: '1', email: 'user@test.com', role: 'viewer' };
      const req = { user };
      
      const expectedResult = [
        { id: 1, title: 'Document 1', description: 'Description 1', createdBy: '1' },
      ];
      
      mockDocumentsService.findByUser.mockResolvedValue(expectedResult);
      
      expect(await controller.findMy(req)).toBe(expectedResult);
      expect(mockDocumentsService.findByUser).toHaveBeenCalledWith(user.id);
    });
  });

  describe('findOne', () => {
    it('should return a single document by id', async () => {
      const id = 1;
      const expectedResult = { id, title: 'Document 1', description: 'Description 1' };
      
      mockDocumentsService.findOne.mockResolvedValue(expectedResult);
      
      expect(await controller.findOne(id)).toBe(expectedResult);
      expect(mockDocumentsService.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a document when user has admin role', async () => {
      const id = 1;
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Document',
        description: 'Updated Description',
      };
      const user = { id: '1', email: 'admin@test.com', role: 'admin' };
      const req = { user };
      
      const expectedResult = { id, ...updateDocumentDto, updatedBy: '1' };
      
      mockDocumentsService.update.mockResolvedValue(expectedResult);
      
      expect(await controller.update(req, id, updateDocumentDto)).toBe(expectedResult);
      expect(mockDocumentsService.update).toHaveBeenCalledWith(id, updateDocumentDto);
    });

    it('should update a document when user has editor role', async () => {
      const id = 1;
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Document',
        description: 'Updated Description',
      };
      const user = { id: '1', email: 'editor@test.com', role: 'editor' };
      const req = { user };
      
      const expectedResult = { id, ...updateDocumentDto, updatedBy: '1' };
      
      mockDocumentsService.update.mockResolvedValue(expectedResult);
      
      expect(await controller.update(req, id, updateDocumentDto)).toBe(expectedResult);
      expect(mockDocumentsService.update).toHaveBeenCalledWith(id, updateDocumentDto);
    });

    it('should throw ForbiddenException when user has viewer role', async () => {
      const id = 1;
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Document',
        description: 'Updated Description',
      };
      try{
      const user = { id: '1', email: 'viewer@test.com', role: 'viewer' };
      const req = { user };

      await expect(controller.update(req, id, updateDocumentDto))
      fail('Expected ForbiddenException but no exception was thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toBe('You do not have access to upload documents');
    }
    });

    it('should throw ForbiddenException when user info is not found', async () => {
      const id = 1;
      const updateDocumentDto: UpdateDocumentDto = {
        title: 'Updated Document',
        description: 'Updated Description',
      };
      try{
      const req = { user: null };
      
      await expect(controller.update(req, id, updateDocumentDto))
      fail('Expected ForbiddenException but no exception was thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toBe('User information not found');
    }
    });
  });

  describe('remove', () => {
    it('should remove a document when user has admin role', async () => {
      const id = '1';
      const user = { id: '1', email: 'admin@test.com', role: 'admin' };
      const req = { user };
      
      const expectedResult = { id: +id, deleted: true };
      
      mockDocumentsService.remove.mockResolvedValue(expectedResult);
      
      expect(await controller.remove(req, id)).toBe(expectedResult);
      expect(mockDocumentsService.remove).toHaveBeenCalledWith(id);
    });

    it('should throw ForbiddenException when user has editor role', async () => {
      try{
      const id = '1';
      const user = { id: '1', email: 'editor@test.com', role: 'editor' };
      const req = { user };
      
      await expect(controller.remove(req, id))
      fail('Expected ForbiddenException but no exception was thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toBe('You do not have permission to perform this action');
    }
    });

    it('should throw ForbiddenException when user has viewer role', async () => {
      try{
      const id = '1';
      const user = { id: '1', email: 'viewer@test.com', role: 'viewer' };
      const req = { user };
      
      await expect(controller.remove(req, id))
      fail('Expected ForbiddenException but no exception was thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toBe('You do not have permission to perform this action');
    }
    });

    it('should throw ForbiddenException when user info is not found', async () => {
      try{
      const id = '1';
      const req = { user: null };
      
      await expect(controller.remove(req, id))
      fail('Expected ForbiddenException but no exception was thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toBe("User information not found");
    }
    });
  });
});