import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentsRepository: Repository<Document>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    documentsRepository = module.get<Repository<Document>>(getRepositoryToken(Document));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a document successfully', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        filename: 'test.pdf',
        path: 'uploads/test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const mockUser = { id: '1', email: 'test@example.com' } as User;
      const createDto = {
        title: 'Test Document',
        description: 'Test Description',
        tags: ['test'],
        category: 'test',
        author: 'Test Author',
        language: 'en',
      };

      const expectedDocument = {
        id: 1,
        ...createDto,
        filename: mockFile.originalname,
        filepath: `uploads/${mockFile.filename}`,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        uploadedBy: mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        isProcessed: false,
        userId: mockUser.id,
      } as Document;

      jest.spyOn(documentsRepository, 'create').mockReturnValue(expectedDocument);
      jest.spyOn(documentsRepository, 'save').mockResolvedValue(expectedDocument);

      const result = await service.create(createDto, mockFile, mockUser);
      
      expect(result).toEqual(expectedDocument);
      expect(documentsRepository.create).toHaveBeenCalledWith({
        ...createDto,
        filename: mockFile.originalname,
        filepath: `uploads/${mockFile.filename}`,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        uploadedBy: mockUser,
      });
      expect(documentsRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...createDto,
        filename: mockFile.originalname,
        filepath: `uploads/${mockFile.filename}`,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        uploadedBy: mockUser,
      }));
    });
  });

  describe('findAll', () => {
    it('should return all documents', async () => {
      const mockDocuments = [
        { id: 1, title: 'Doc 1' },
        { id: 2, title: 'Doc 2' },
      ] as Document[];

      jest.spyOn(documentsRepository, 'find').mockResolvedValue(mockDocuments);

      const result = await service.findAll();
      expect(result).toEqual(mockDocuments);
      expect(documentsRepository.find).toHaveBeenCalledWith({
        relations: ['uploadedBy'],
      });
    });
  });

  describe('findByUser', () => {
    it('should return documents for a specific user', async () => {
      const userId = '1';
      const mockDocuments = [
        { id: 1, title: 'User Doc 1', uploadedBy: { id: userId } },
      ] as Document[];

      jest.spyOn(documentsRepository, 'find').mockResolvedValue(mockDocuments);

      const result = await service.findByUser(userId);
      expect(result).toEqual(mockDocuments);
      expect(documentsRepository.find).toHaveBeenCalledWith({
        where: { uploadedBy: { id: userId } },
        relations: ['uploadedBy'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      const documentId = 1;
      const mockDocument = { id: documentId, title: 'Test Doc' } as Document;

      jest.spyOn(documentsRepository, 'findOne').mockResolvedValue(mockDocument);

      const result = await service.findOne(documentId);
      expect(result).toEqual(mockDocument);
      expect(documentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: documentId },
        relations: ['uploadedBy'],
      });
    });

    it('should throw NotFoundException if document not found', async () => {
      const documentId = 999;
      jest.spyOn(documentsRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(documentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a document', async () => {
      const documentId = 1;
      const updateDto = { title: 'Updated Title' };
      const existingDoc = { id: documentId, title: 'Original Title' } as Document;
      const updatedDoc = { ...existingDoc, ...updateDto } as Document;

      jest.spyOn(service, 'findOne').mockResolvedValue(existingDoc);
      jest.spyOn(documentsRepository, 'save').mockResolvedValue(updatedDoc);

      const result = await service.update(documentId, updateDto);
      expect(result).toEqual(updatedDoc);
      expect(service.findOne).toHaveBeenCalledWith(documentId);
      expect(documentsRepository.save).toHaveBeenCalledWith(updatedDoc);
    });
  });

  describe('remove', () => {
    it('should delete a document', async () => {
      const documentId = '1';
      jest.spyOn(documentsRepository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

      await service.remove(documentId);
      expect(documentsRepository.delete).toHaveBeenCalledWith(documentId);
    });

    it('should throw NotFoundException if document not found', async () => {
      const documentId = '999';
      jest.spyOn(documentsRepository, 'delete').mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.remove(documentId)).rejects.toThrow(NotFoundException);
    });
  });
});
