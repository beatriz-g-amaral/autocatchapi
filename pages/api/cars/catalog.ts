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
    const [totalCars] = await db.query(
      `SELECT * FROM cars`
    );

    res.status(200).json({
      allCars: totalCars,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
