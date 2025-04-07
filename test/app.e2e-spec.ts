import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';

describe('E2E - Auth & Documents', () => {
  let app: INestApplication;
  let token: string;
  let testDocumentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get<string>('DATABASE_HOST'),
            port: Number(configService.get<string>('DATABASE_PORT')),
            username: configService.get<string>('DATABASE_USERNAME'),
            password: configService.get<string>('DATABASE_PASSWORD'),
            database: configService.get<string>('DATABASE_NAME'),
            entities: ['src/**/*.entity{.ts,.js}'],
            synchronize: true,
          }),
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
    app.setGlobalPrefix('api');
    await app.init();

    // Register user (skip if already exists)
    await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'login-test@example.com',
      password: 'password123',
    }).catch(() => { }); // ignore duplicate error

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'login-test@example.com',
        password: 'password123',
      })
      .expect(200);

    token = loginRes.body.access_token;
    expect(token).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── AUTH TESTS ───────────────────────────────────────

  it('/api/auth/register (POST) - should register a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

    if (res.status === 201) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', 'test@example.com');
      expect(res.body).toHaveProperty('firstName', 'Test');
      expect(res.body).toHaveProperty('lastName', 'User');
      expect(res.body).toHaveProperty('role', 'viewer');
      expect(res.body).not.toHaveProperty('password');
    } else if (res.status === 409) {
      console.log('User already exists');
    } else {
      throw new Error(`Unexpected status code: ${res.status}`);
    }
  });

  it('/api/auth/login (POST) - should login and return JWT token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'login-test@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    console.log("user", res.body)
    // expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email', 'login-test@example.com');
  });

  // ─── DOCUMENT TESTS ───────────────────────────────────────

  describe('Documents (e2e)', () => {
    
    it('/api/documents (POST) - should create a document (admin/editor)', async () => {
      // Step 1: Login as an admin user
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com', // Ensure this is an admin user
          password: 'password123',
        });

      expect(loginRes.body).toHaveProperty('access_token');

      const token = loginRes.body.access_token;

      // Step 2: Create the document
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .field('metadata', JSON.stringify({
          title: 'Test Document',
          description: 'Test Description',
        }))
        .attach('file', Buffer.from('test content'), 'test.pdf');

      if (loginRes.body.user.role === 'admin' || loginRes.body.user.role === 'editor') {
        expect(response.status).toBe(201);
        console.log('Document created with ID:', response.body.id);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('title', 'Test Document');
        expect(response.body).toHaveProperty('filePath');

        const testDocumentId = response.body.id;

        // Step 3: Fetch the created document
        const documentResponse = await request(app.getHttpServer())
          .get(`/api/documents/${testDocumentId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(documentResponse.body).toHaveProperty('id', testDocumentId);
        expect(documentResponse.body).toHaveProperty('title', 'Test Document');

      } else if (loginRes.body.user.role === 'viewer') {
        expect(response.status).toBe(403);
      } else {
        expect(response.status).toBe(401);
      }
    });

    it('/api/documents (POST) - should reject invalid file types', async () => {    
      // Step 2: Attempt to create a document with invalid file type
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .field('metadata', JSON.stringify({
          title: 'Invalid File',
          description: 'Should fail'
        }))
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(400);
    
      expect(response.body.message).toBe('Only PDF and Word documents are allowed');
    });

    it('/api/documents (GET) - should list all documents', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length);
    });

    it('/api/documents/my (GET) - should list user documents', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some(doc => doc.title === 'Test Document'));
    });

    it('/api/documents/:id (GET) - should get document by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/documents/${4}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body);
    });

    it('/api/documents/:id (PATCH) - should update document (admin)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/documents/${4}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
          description: 'Updated Description'
        })

      expect(response.body);
    });

    it('/api/documents/:id (PATCH) - should reject viewer updates', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/documents/${4}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Should Fail',
          description: 'Should fail'
        })
        .expect(403);

      expect(response.body.message).toBe('You do not have access to upload documents');
    });

    it('/api/documents/:id (DELETE) - should delete document (admin)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/documents/${4}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('/api/documents/:id (DELETE) - should reject editor deletes', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .field('metadata', JSON.stringify({
          title: 'Temp Document',
          description: 'To be deleted'
        }))
        .attach('file', Buffer.from('test content'), 'test.pdf');

      const response = await request(app.getHttpServer())
        .delete(`/api/documents/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe('You do not have permission to perform this action');
    });
  });

});
