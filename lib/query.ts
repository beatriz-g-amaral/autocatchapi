import { db } from './db';

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await db.query(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}
