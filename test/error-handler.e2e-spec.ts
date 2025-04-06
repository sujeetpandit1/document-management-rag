import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/utils/global.error.handler';

describe('ErrorHandler (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [],
          synchronize: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle 404 errors', () => {
    return request(app.getHttpServer())
      .get('/non-existent-route')
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 404,
          errorCode: 'NOT_FOUND',
          message: 'Cannot GET /non-existent-route',
        });
      });
  });

  it('should handle validation errors', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({}) // Empty payload should trigger validation errors
      .expect(400)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 400,
          errorCode: 'VALIDATION_ERROR',
          message: expect.any(String),
        });
        expect(res.body.details).toBeDefined();
      });
  });

  it('should handle internal server errors', async () => {
    // Create a test route that throws an error
    app.getHttpAdapter().get('/test-error', () => {
      throw new Error('Test error');
    });

    return request(app.getHttpServer())
      .get('/test-error')
      .expect(500)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 500,
          errorCode: 'INTERNAL_ERROR',
          message: 'Test error',
        });
      });
  });
});
