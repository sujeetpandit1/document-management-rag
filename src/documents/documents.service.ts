import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
  ) {}

  // async create(createDocumentDto: CreateDocumentDto, file: Express.Multer.File, user: User): Promise<Document> {
  //   const { title, description } = createDocumentDto;

  //   const document = this.documentsRepository.create({
  //     title,
  //     description,
  //     filename: file.originalname,
  //     filepath: file.path,
  //     mimeType: file.mimetype,
  //     size: file.size,
  //     uploadedBy: user,
  //   });

  //   return this.documentsRepository.save(document);
  // }

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    user: User,
  ): Promise<Document> {
    const { title, description, tags, category, author, language } =
      createDocumentDto;

    const documentData: DeepPartial<Document> = {
      title,
      description,
      tags,
      category,
      author,
      language,
      filename: file.originalname,
      filepath: `uploads/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: user,
    };

    const document = this.documentsRepository.create(documentData);
    return this.documentsRepository.save(document);
  }

  async findAll(): Promise<Document[]> {
    return this.documentsRepository.find({
      relations: ['uploadedBy'],
    });
  }

  async findByUser(userId: string): Promise<Document[]> {
    return this.documentsRepository.find({
      where: { uploadedBy: { id: userId } },
      relations: ['uploadedBy'],
    });
  }

  async findOne(id: number): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }

    return document;
  }

  async update(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<Document> {
    const document = await this.findOne(id);

    // Update document properties
    Object.assign(document, updateDocumentDto);

    return this.documentsRepository.save(document);
  }

  async remove(id: string): Promise<void> {
    const result = await this.documentsRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }
  }
}
