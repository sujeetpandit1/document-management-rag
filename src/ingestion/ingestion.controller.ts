import { Controller, Get, Post, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { TriggerIngestionDto } from './dto/trigger-ingestion.dto';
import { IngestionStatus } from './entities/ingestion.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@Controller('ingestion')
export class IngestionController {
  findByUser(userId: string) {
    throw new Error('Method not implemented.');
  }
  constructor(private ingestionService: IngestionService) {}

  @Post('trigger')
  @UseGuards(JwtAuthGuard)
  triggerIngestion(
    @Body() triggerIngestionDto: TriggerIngestionDto,
    @Req() req,
  ) {
    // Get user info
        const user = req.user as any;
        // console.log(user);
        if (!user) {
          throw new ForbiddenException('User information not found');
        }
      
        // Role-based access
        const allowedRoles = ['admin', 'editor'];
        if (!allowedRoles.includes(user.role)) {
          throw new ForbiddenException('You do not have access to upload documents');
        }
    return this.ingestionService.triggerIngestion(triggerIngestionDto, user);
  }

  @Post('callback')
  updateIngestionStatus(
    @Body() payload: { ingestionId: string; status: IngestionStatus; errorMessage?: string },
  ) {
    return this.ingestionService.updateIngestionStatus(
      payload.ingestionId,
      payload.status,
      payload.errorMessage,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req) {

    const user = req.user as any;
        // console.log(user);
        if (!user) {
          throw new ForbiddenException('User information not found');
        }
      
        // Role-based access
        const allowedRoles = ['admin'];
        if (!allowedRoles.includes(user.role)) {
          throw new ForbiddenException('You do not have access to upload documents');
        }
    return this.ingestionService.findAll();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMy(@Req() req) {
    return this.ingestionService.findByUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ingestionService.findOne(id);
  }
}