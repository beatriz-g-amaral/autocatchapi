import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  let userId: number | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      userId = (decoded as any).userId;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } else {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const { rarity, xp_min, xp_max, name } = req.query;

    const conditions: string[] = ['id NOT IN (SELECT car_id FROM captures WHERE user_id = ?)'];
    const values: any[] = [userId];
    
    if (rarity && rarity !== 'null' && rarity !== '') {
      conditions.push('rarity = ?');
      values.push(rarity);
    }
    
    if (xp_min && !isNaN(Number(xp_min))) {
      conditions.push('xp >= ?');
      values.push(Number(xp_min));
    }
    
    if (xp_max && !isNaN(Number(xp_max))) {
      conditions.push('xp <= ?');
      values.push(Number(xp_max));
    }
    
    if (name && name !== '') {
      conditions.push('name LIKE ?');
      values.push(`%${name}%`);
    }
    

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [missingCars] = await db.query(`SELECT * FROM cars ${whereClause}`, values);

    return res.status(200).json({
      missingCount: (missingCars as any[]).length,
      missingCars: missingCars,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
