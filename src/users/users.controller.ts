import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {} 

  @Get()
  // @Roles(Role.ADMIN, Role.VIEWER)
  findAll(@Req() req: Request) {

    const user = req.user as any; // Cast if needed
    const allowedRoles = ['admin'];

    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have access to this resource');
    }
    // console.log('Request User:', request.user); // Log request.user
    return this.usersService.findAll();
    // return 'Only viewer or admin can see this!';
  }

  @Get('me')
  findOne(@Req() req: Request) {
    const user = req.user as any; // Cast if needed
    const allowedRoles = ['admin'];
    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have access to this resource');
    }
    return this.usersService.findById(user.id);
  }

  @Patch('update')
  update(@Req() req: Request, @Body() updateUserDto: UpdateUserDto) {
    const user = req.user as any; // Cast if needed
    const allowedRoles = ['admin'];
    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have access to this resource');
    }
    return this.usersService.update(user.id, updateUserDto);
  }

  @Delete('delete')
  remove(@Req() req: Request) {
    const user = req.user as any; // Cast if needed
    const allowedRoles = ['admin'];
    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have access to this resource');
    }
    return this.usersService.remove(user.id);
  }
}