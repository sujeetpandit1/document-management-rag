import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  // @Roles(Role.ADMIN, Role.EDITOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}-${file.originalname}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Only PDF and Word documents are allowed'),
            false,
          );
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async create(
    @Body('metadata') metadata: string, // Accept as a string
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    // Parse metadata JSON
    let parsedMetadata: CreateDocumentDto;
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (error) {
      throw new BadRequestException('Invalid metadata format');
    }

    // Get user info
    const user = req.user;
    // console.log(user);
    if (!user) {
      throw new ForbiddenException('User information not found');
    }

    // Role-based access
    const allowedRoles = ['admin', 'editor'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    // Ensure file exists
    if (!file) {
      throw new BadRequestException('File upload is required');
    }

    // Call service method
    return this.documentsService.create(parsedMetadata, file, user);
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get('my')
  findMy(@Req() req) {
    return this.documentsService.findByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  // @Roles(Role.ADMIN, Role.EDITOR)
  update(
    @Req() req,
    @Param('id') id: number,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    // Get user info
    const user = req.user;
    // console.log(user);
    if (!user) {
      throw new ForbiddenException('User information not found');
    }

    // Role-based access
    const allowedRoles = ['admin', 'editor'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have access to upload documents',
      );
    }
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  // @Roles(Role.ADMIN)
  remove(@Req() req, @Param('id') id: string) {
    // Get user info
    const user = req.user;
    // console.log(user);
    if (!user) {
      throw new ForbiddenException('User information not found');
    }

    // Role-based access
    const allowedRoles = ['admin'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
    return this.documentsService.remove(id);
  }
}
