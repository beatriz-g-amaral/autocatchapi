import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

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
    const [rows] = await db.query(
      `SELECT 
        captures.id AS capture_id,
        captures.image_path,
        captures.location,
        captures.captured_at,
        cars.id AS car_id,
        cars.name,
        cars.description,
        cars.rarity
      FROM captures
      JOIN cars ON captures.car_id = cars.id
      WHERE captures.user_id = ?`,
      [userId]
    );

    const garage = (rows as any[]).map(capture => {
      const imageUrl = capture.image_path;

      // // TODO: ADICIONAR IMAGEM COMO BASE64
      // const absolutePath = path.join(process.cwd(), 'public', capture.image_path);
      // const imageBase64 = fs.existsSync(absolutePath)
      //   ? fs.readFileSync(absolutePath, { encoding: 'base64' })
      //   : null;

      return {
        capture_id: capture.capture_id,
        car: {
          id: capture.car_id,
          name: capture.name,
          description: capture.description,
          rarity: capture.rarity,
        },
        location: capture.location,
        captured_at: capture.captured_at,
        image_url: imageUrl,
        // image_base64: imageBase64 ? `data:image/png;base64,${imageBase64}` : null
      };
    });

    res.status(200).json({ garage });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
