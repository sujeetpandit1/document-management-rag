import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export async function initializeDatabase(
  configService: ConfigService,
): Promise<void> {
  const databaseName = configService.get<string>('DATABASE_NAME');
  const host = configService.get<string>('DATABASE_HOST');
  const port = configService.get<number>('DATABASE_PORT');
  const username = configService.get<string>('DATABASE_USERNAME');
  const password = configService.get<string>('DATABASE_PASSWORD');

  const pool = new Pool({
    host,
    port,
    user: username,
    password,
    database: 'postgres', // Connect to the default postgres database
  });

  try {
    const result = await pool.query(
      `SELECT 1 FROM pg_database WHERE datname = '${databaseName}'`,
    );

    if (result.rows.length === 0) {
      console.warn(
        `Database '${databaseName}' does not exist. Creating... (Development only!)`,
      );
      await pool.query(`CREATE DATABASE ${databaseName}`);
      console.log(`Database '${databaseName}' created.`);
    } else {
      console.log(`Database '${databaseName}' exists.`);
    }
  } catch (error) {
    console.error('Error checking/creating database:', error);
  } finally {
    await pool.end(); // Close the connection pool
  }
}
