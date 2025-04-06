import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker'; // Import from @faker-js/faker
import { AppModule } from '../app.module';
import { User } from '../users/entities/user.entity';
import { Document } from '../documents/entities/document.entity';
import { Ingestion, IngestionStatus } from '../ingestion/entities/ingestion.entity';
import { DeepPartial } from 'typeorm';
import { Role } from 'src/common/enums/role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const documentRepository = app.get<Repository<Document>>(getRepositoryToken(Document));
  const ingestionRepository = app.get<Repository<Ingestion>>(getRepositoryToken(Ingestion));

  // Generate admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = userRepository.create({
    email: 'admin@example.com',
    password: adminPassword,
    firstName: 'Admin',
    lastName: 'User',
    role: Role.ADMIN, // need to correct
  });
  await userRepository.save(admin);
  console.log('Admin user created');

  // Generate regular users
  const users: User[] = [];
  for (let i = 0; i < 999; i++) {
    const password = await bcrypt.hash('password123', 10);
    const role = faker.helpers.arrayElement([Role.EDITOR, Role.VIEWER]); // Corrected random array element

    const user = userRepository.create({
      email: faker.internet.email(),
      password,
      firstName: faker.person.firstName(), // Corrected name functions
      lastName: faker.person.lastName(),
      role,
    });

    users.push(user);

    if (users.length === 100) {
      await userRepository.save(users);
      console.log(`Saved ${users.length} users`);
      users.length = 0;
    }
  }

  if (users.length > 0) {
    await userRepository.save(users);
    console.log(`Saved ${users.length} users`);
  }

  console.log('1000 users created');

  // Generate documents
  const allUsers = await userRepository.find();
  const documents: DeepPartial<Document>[] = []; // Corrected type here

  for (let i = 0; i < 1000; i++) {
    const user: User = faker.helpers.arrayElement(allUsers); // corrected random array element

    const document: DeepPartial<Document> = { // Corrected type, and variable type.
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      filename: `${faker.string.uuid()}.pdf`, //Corrected uuid call
      filepath: `uploads/${faker.string.uuid()}.pdf`, //corrected uuid call
      mimeType: 'application/pdf',
      size: faker.number.int({ min: 1000, max: 10000000 }), //corrected number call.
      uploadedBy: user,
      isProcessed: faker.datatype.boolean(),
    };

    documents.push(document);

    if (documents.length === 100) {
      await documentRepository.save(documents);
      console.log(`Saved ${documents.length} documents`);
      documents.length = 0;
    }
  }

  if (documents.length > 0) {
    await documentRepository.save(documents);
    console.log(`Saved ${documents.length} documents`);
  }

  console.log('1000 documents created');

  // Generate ingestions
  const allDocuments = await documentRepository.find();
  const ingestions: DeepPartial<Ingestion>[] = []; //Corrected type here.

  for (let i = 0; i < 500; i++) {
    const user = faker.helpers.arrayElement(allUsers); // corrected random array element
    const document = faker.helpers.arrayElement(allDocuments); // corrected random array element
    const status = faker.helpers.arrayElement(Object.values(IngestionStatus)); // corrected random array element

    const ingestion: DeepPartial<Ingestion> = { //corrected type here
      documentId: document.id,
      triggeredById: user.id,
      status,
      errorMessage: status === IngestionStatus.FAILED ? faker.lorem.sentence() : null,
    };

    ingestions.push(ingestion);

    if (ingestions.length === 100) {
      await ingestionRepository.save(ingestions);
      console.log(`Saved ${ingestions.length} ingestions`);
      ingestions.length = 0;
    }
  }

  if (ingestions.length > 0) {
    await ingestionRepository.save(ingestions);
    console.log(`Saved ${ingestions.length} ingestions`);
  }

  console.log('500 ingestions created');

  await app.close();
}

bootstrap();