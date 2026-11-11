import { neon } from '@neondatabase/serverless';

const databaseUrl = import.meta.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.warn('VITE_DATABASE_URL não configurada no .env');
}

export const sql = neon(databaseUrl || '');

