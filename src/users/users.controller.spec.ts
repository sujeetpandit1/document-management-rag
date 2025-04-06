import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ForbiddenException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: Partial<UsersService>;

  beforeEach(async () => {
    mockUsersService = {
      findAll: jest
        .fn()
        .mockResolvedValue([{ id: '1', email: 'test@test.com' }]),
      findById: jest
        .fn()
        .mockImplementation((id) =>
          Promise.resolve({ id, email: 'test@test.com' }),
        ),
      update: jest
        .fn()
        .mockImplementation((id, updateDto) =>
          Promise.resolve({ id, ...updateDto }),
        ),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /users', () => {
    it('should return users for admin', async () => {
      const req = { user: { role: 'admin' } };
      const result = await controller.findAll(req as any);
      expect(result).toEqual([{ id: '1', email: 'test@test.com' }]);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-admin', async () => {
      const req = { user: { role: 'user' } };
      try {
        await controller.findAll(req as any);
        fail('Expected ForbiddenException but no exception was thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('You do not have access to this resource');
      }
    });

    it('should throw ForbiddenException when user is undefined', async () => {
      const req = { user: undefined };
      try {
        await controller.findAll(req as any);
        fail('Expected ForbiddenException but no exception was thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('You do not have access to this resource');
      }
    });
  });

  describe('GET /users/me', () => {
    it('should return current user for admin', async () => {
      const req = { user: { id: '1', role: 'admin' } };
      const result = await controller.findOne(req as any);
      expect(result).toEqual({ id: '1', email: 'test@test.com' });
      expect(mockUsersService.findById).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException for non-admin', async () => {
      const req = { user: { id: '1', role: 'user' } };
      try {
        await controller.findOne(req as any);
        fail('Expected ForbiddenException but no exception was thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('You do not have access to this resource');
      }
    });

    it('should throw ForbiddenException when user is undefined', async () => {
      const req = { user: undefined };
      try {
        await controller.findOne(req as any);
        fail('Expected ForbiddenException but no exception was thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('You do not have access to this resource');
      }
    });
  });

  describe('PATCH /users/update', () => {
    it('should update current user for admin', async () => {
      const req = { user: { id: '1', role: 'admin' } };
      const updateDto = { firstName: 'Updated' };
      const result = await controller.update(req as any, updateDto);
      expect(result).toEqual({ id: '1', firstName: 'Updated' });
      expect(mockUsersService.update).toHaveBeenCalledWith('1', updateDto);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      const req = { user: { id: '1', role: 'user' } };
      const updateDto = { firstName: 'Updated' };
      try {
        await controller.update(req as any, updateDto);
        fail('Expected ForbiddenException but no exception was thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('You do not have access to this resource');
      }
    });

    it('should throw ForbiddenException when user is undefined', async () => {
      const req = { user: undefined };
      const updateDto = { firstName: 'Updated' };
      try {
        await controller.update(req as any, updateDto);
        fail('Expected ForbiddenException but no exception was thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('You do not have access to this resource');
      }
    });
  });

  describe('DELETE /users/delete', () => {
    it('should delete current user for admin', async () => {
      const req = { user: { id: '1', role: 'admin' } };
      await controller.remove(req as any);
      expect(mockUsersService.remove).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException for non-admin', async () => {
      const req = { user: { id: '1', role: 'user' } };
      try {
        await controller.remove(req as any);
        fail('Expected ForbiddenException but no exception was thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('You do not have access to this resource');
      }
    });

    it('should throw ForbiddenException when user is undefined', async () => {
      const req = { user: undefined };
      try {
        await controller.remove(req as any);
        fail('Expected ForbiddenException but no exception was thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('You do not have access to this resource');
      }
    });
  });
});
