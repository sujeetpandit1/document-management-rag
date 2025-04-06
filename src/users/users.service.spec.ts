import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { HttpException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterDto } from '../auth/dto/register.auth.dto';
import { Role } from '../common/enums/role.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const registerDto: RegisterDto = {
        email: 'test@test.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      };
      const expectedUser: User = {
        ...registerDto,
        password: 'hashedPassword',
        id: '1',
        role: Role.VIEWER,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: [],
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(expectedUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(expectedUser);

      const result = await service.create(registerDto);
      expect(result).toEqual(expectedUser);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    });

    it('should throw conflict exception if email exists', async () => {
      const registerDto: RegisterDto = {
        email: 'test@test.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      };
      const existingUser = { email: 'test@test.com' };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(existingUser as User);

      await expect(service.create(registerDto)).rejects.toThrow(HttpException);
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      const email = 'test@test.com';
      const expectedUser = { email, id: '1' };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(expectedUser as User);

      const result = await service.findByEmail(email);
      expect(result).toEqual(expectedUser);
    });

    it('should return null if not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@test.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      const id = '1';
      const expectedUser = { id, email: 'test@test.com' };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(expectedUser as User);

      const result = await service.findById(id);
      expect(result).toEqual(expectedUser);
    });

    it('should throw NotFoundException if not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const expectedUsers = [
        { id: '1', email: 'test1@test.com' },
        { id: '2', email: 'test2@test.com' },
      ];

      jest
        .spyOn(userRepository, 'find')
        .mockResolvedValue(expectedUsers as User[]);

      const result = await service.findAll();
      expect(result).toEqual(expectedUsers);
    });

    it('should return empty array if no users', async () => {
      jest.spyOn(userRepository, 'find').mockResolvedValue([]);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update and return user', async () => {
      const id = '1';
      const updateDto: UpdateUserDto = { firstName: 'Updated' };
      const existingUser = { id, firstName: 'Original' };
      const expectedUser = { ...existingUser, ...updateDto };

      jest.spyOn(service, 'findById').mockResolvedValue(existingUser as User);
      jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue(expectedUser as User);

      const result = await service.update(id, updateDto);
      expect(result).toEqual(expectedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest
        .spyOn(service, 'findById')
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.update('nonexistent', {} as UpdateUserDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const id = '1';
      await service.remove(id);
      expect(userRepository.delete).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest
        .spyOn(userRepository, 'delete')
        .mockResolvedValue({ affected: 0 } as any);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
