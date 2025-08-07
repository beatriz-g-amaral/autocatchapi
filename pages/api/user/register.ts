import type { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '../../../lib/query';
import bcrypt from 'bcrypt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Missing fields: username, password or email' });
  }

  try {
    const emailExists = await queryOne(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (emailExists) {
      return res.status(409).json({ error: 'Email is taken' });
    }

    const usernameExists = await queryOne(`SELECT id FROM users WHERE username = ? LIMIT 1`, [username]);
    if (usernameExists) {
      return res.status(409).json({ error: 'Username is taken' });
    }

    const decodedPassword = Buffer.from(password, 'base64').toString('utf-8');
    const hashedPassword = await bcrypt.hash(decodedPassword, 10);

    await query(
      `INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())`,
      [username, email, hashedPassword]
    );

    return res.status(201).json({ message: 'Success' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
