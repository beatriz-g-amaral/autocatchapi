import type { NextApiRequest, NextApiResponse } from 'next';
import { queryOne } from '../../../lib/query';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end(`Method ${req.method} Not Allowed`);

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  try {
    const user = await queryOne<{
      id: number;
      username: string;
      xp: string;
      level: string;
      email: string;
      password: string;
    }>(
      `SELECT * FROM users WHERE username = ? LIMIT 1`,
      [username]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const decodedPassword = Buffer.from(password, 'base64').toString('utf-8');
    const passwordMatch = await bcrypt.compare(decodedPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });

    return res.status(200).json({
      message: 'Success Login',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        level: user.level
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
