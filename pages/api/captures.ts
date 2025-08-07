import type { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '../../lib/query';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { user_id, car_id, location, image_base64 } = req.body;

  if (!car_id || !image_base64) {
    return res.status(400).json({ error: 'Missing fields: car_id or image' });
  }

  const authHeader = req.headers.authorization;
  let authenticatedUserId: number | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      authenticatedUserId = (decoded as any).userId;
    } catch (error) {
      console.warn('JWT inválido:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  const finalUserId = Number(authenticatedUserId ?? user_id);
  if (!finalUserId || isNaN(finalUserId)) {
    return res.status(400).json({ error: 'Missing or invalid user_id' });
  }

  try {
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `capture_${Date.now()}.png`;
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    fs.writeFileSync(filePath, buffer);

    await query(
      `INSERT INTO captures (user_id, car_id, location, image_path) VALUES (?, ?, ?, ?)`,
      [finalUserId, car_id, location || null, `/uploads/${filename}`]
    );

    const car = await queryOne<{ rarity: string }>(
      `SELECT rarity FROM cars WHERE id = ?`,
      [car_id]
    );
    const rarity = car?.rarity ?? 'Common';

    let earnedXP = 10;
    if (rarity === 'Rare') earnedXP = 20;
    if (rarity === 'Legendary') earnedXP = 50;

    const user = await queryOne<{ xp: number, level: number }>(
      `SELECT xp, level FROM users WHERE id = ?`,
      [finalUserId]
    );

    const newXP = (user?.xp ?? 0) + earnedXP;
    const newLevel = Math.floor(0.25 * Math.sqrt(newXP));

    await query(
      `UPDATE users SET xp = ?, level = ? WHERE id = ?`,
      [newXP, newLevel, finalUserId]
    );

    return res.status(201).json({
      message: 'Capture saved successfully',
      image: `/uploads/${filename}`,
      earnedXP,
      newXP,
      newLevel
    });
  } catch (err) {
    console.error('Error during capture save:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
