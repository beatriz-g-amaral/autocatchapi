import type { NextApiRequest, NextApiResponse } from 'next';
import { queryOne } from '@/lib/query';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end(`Method ${req.method} Not Allowed`);

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  let userId: number;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    userId = (decoded as any).userId;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const todayResult = await queryOne(
      `SELECT COUNT(*) AS total FROM captures WHERE user_id = ? AND DATE(captured_at) = CURDATE()`,
      [userId]
    );

    const allUserCaptures = await queryOne(
      `SELECT COUNT(*) AS total FROM captures WHERE user_id = ?`,
      [userId]
    );

    const totalCars = await queryOne(`SELECT COUNT(*) AS total FROM cars`);

    const today = todayResult?.total ?? 0;
    const total = allUserCaptures?.total ?? 0;
    const missing = (totalCars?.total ?? 0) - total;

    return res.status(200).json({
      todayCatches: today,
      totalCatches: total,
      missingCatches: missing,
    });

  } catch (error) {
    console.error('Dashboard summary error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
