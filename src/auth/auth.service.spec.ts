import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.auth.dto';
import { LoginDto } from './dto/login.dto';
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a new user and return the user without password', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const createdUser = {
        id: '1',
        email: registerDto.email,
        // password: 'hashedPassword',
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: ['admin', 'viewer'],
      };

      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        role: createdUser.role,
      });
      expect(('password')).toBe('password');
    });

    it('should throw an error if usersService.create throws an error', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };
      mockUsersService.create.mockRejectedValue(new Error('Some error'));

      await expect(service.register(registerDto)).rejects.toThrow('Some error');
    });
  });

  describe('login', () => {
    it('should return JWT token and user data when credentials are valid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        role: ['admin', 'viewer'],
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt_token');

      const result = await service.login(loginDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual({
        access_token: 'jwt_token',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        role: ['admin', 'viewer'],
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw an error if usersService.findByEmail throws an error', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockUsersService.findByEmail.mockRejectedValue(new Error('Some error'));

      await expect(service.login(loginDto)).rejects.toThrow('Some error');
    });

    it('should throw an error if bcrypt.compare throws an error', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: '1',
        email: loginDto.email,
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        role: ['admin', 'viewer'],
      };
      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Some error'));

      await expect(service.login(loginDto)).rejects.toThrow('Some error');
    });

    describe('jwtService.sign error', () => {
      it('should throw an error if jwtService.sign throws an error', async () => {
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'password123',
        };

        const user = {
          id: '1',
          email: loginDto.email,
          password: 'hashedPassword',
          firstName: 'Test',
          lastName: 'User',
          role: ['admin', 'viewer'],
        };
        mockUsersService.findByEmail.mockResolvedValue(user);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.sign.mockImplementation(() => {
          throw new Error('Some error');
        });

        await expect(service.login(loginDto)).rejects.toThrow('Some error');
      });
    });
  });
});
