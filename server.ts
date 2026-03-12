import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import db from './server/db.js';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
  
  const token = authHeader.split(' ')[1];
  
  // Check if token is blacklisted
  const isBlacklisted = db.prepare('SELECT 1 FROM token_blacklist WHERE token = ?').get(token);
  if (isBlacklisted) {
    return res.status(401).json({ error: 'Sesión terminada' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// --- HELPERS ---
const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@impulsared.com';
    const testEmail = 'user@test.com';
    
    const adminExists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(adminEmail);
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.prepare('INSERT INTO users (name, email, password, role, referral_code) VALUES (?, ?, ?, ?, ?)')
        .run('Administrador', adminEmail, hashedPassword, 'admin', 'ADMIN001');
      console.log('Admin user seeded successfully');
    }

    const testUserExists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(testEmail);
    if (!testUserExists) {
      const hashedPassword = await bcrypt.hash('user123', 10);
      db.prepare('INSERT INTO users (name, email, password, role, referral_code) VALUES (?, ?, ?, ?, ?)')
        .run('Usuario Test', testEmail, hashedPassword, 'user', 'USER001');
      console.log('Test user seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const generateReferralCode = (name: string) => {
  const prefix = name.substring(0, 3).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${random}`;
};

const getBadgeForLevel = (level: number) => {
  if (level >= 100) return 'Arquitecto';
  if (level >= 90) return 'Líder Supremo';
  if (level >= 80) return 'Transformador';
  if (level >= 70) return 'Referente';
  if (level >= 60) return 'Mentor';
  if (level >= 50) return 'Inspirador';
  if (level >= 40) return 'Constructor';
  if (level >= 30) return 'Estratega';
  if (level >= 20) return 'Visionario';
  if (level >= 10) return 'Emprendedor';
  return 'Novato';
};

const processXpGain = (userId: number, xpToAdd: number) => {
  const user = db.prepare('SELECT level, xp, plan, percentage FROM users WHERE id = ?').get(userId) as any;
  if (!user) return null;

  let newXp = user.xp + xpToAdd;
  let newLevel = user.level;
  let newPercentage = user.percentage;
  let leveledUp = false;
  let levelsGained = 0;

  while (newLevel < 100) {
    const xpNeeded = newLevel * 100;
    if (newXp >= xpNeeded) {
      newXp -= xpNeeded;
      newLevel += 1;
      levelsGained += 1;
      leveledUp = true;
      
      let increment = 0.5;
      if (user.plan === 'Básico') increment = 0.65;
      else if (user.plan === 'Avanzado') increment = 0.60;
      else if (user.plan === 'Pro') increment = 0.50;
      else if (user.plan === 'Élite') increment = 0.40;

      newPercentage = Math.min(70, newPercentage + increment);
    } else {
      break;
    }
  }

  db.prepare('UPDATE users SET xp = ?, level = ?, percentage = ? WHERE id = ?')
    .run(newXp, newLevel, newPercentage, userId);

  return {
    leveledUp,
    levelsGained,
    newLevel,
    newPercentage,
    newXp
  };
};

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    res.json({ 
      status: 'ok', 
      db: 'connected', 
      users: userCount.count,
      env: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health Check Error:', error);
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// Auth: Get Current User
app.get('/api/user/me', authenticateToken, (req: any, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, plan, level, xp, percentage, referral_code, role FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    // Calculate total earned from transactions
    const totalEarned = db.prepare('SELECT SUM(commission) as total FROM transactions WHERE user_id = ? AND type = \'referral_commission\'').get(user.id) as any;
    
    res.json({ 
      ...user, 
      badge: getBadgeForLevel(user.level),
      totalEarned: totalEarned?.total || 0 
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Error al obtener datos del usuario' });
  }
});

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, referrerCode } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique referral code
    let referral_code = generateReferralCode(name);
    let codeExists = db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(referral_code);
    while (codeExists) {
      referral_code = generateReferralCode(name);
      codeExists = db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(referral_code);
    }

    // Insert user
    const insert = db.prepare('INSERT INTO users (name, email, password, referral_code) VALUES (?, ?, ?, ?)');
    const info = insert.run(name, normalizedEmail, hashedPassword, referral_code);
    const userId = info.lastInsertRowid;

    // Handle referral
    if (referrerCode) {
      const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referrerCode) as any;
      if (referrer) {
        db.prepare('INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)').run(referrer.id, userId);
        // Give 50 XP for inviting a contact
        processXpGain(referrer.id, 50);
      }
    }

    // Generate token
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: userId, name, email: normalizedEmail, plan: 'Básico', level: 1, xp: 0, percentage: 5.0, referral_code, role: 'user' } 
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`User logged in: ${user.email} (Role: ${user.role})`);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Auth: Logout
app.post('/api/auth/logout', authenticateToken, (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      db.prepare('INSERT OR IGNORE INTO token_blacklist (token) VALUES (?)').run(token);
    }
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

// User: Get Referrals
app.get('/api/referrals', authenticateToken, (req: any, res) => {
  try {
    const referrals = db.prepare(`
      SELECT u.id, u.name, u.plan, u.created_at,
      (SELECT SUM(commission) FROM transactions WHERE user_id = ? AND referred_id = u.id) as total_commission
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = ?
    `).all(req.user.id, req.user.id);
    
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener referidos' });
  }
});

// User: Purchase Plan
app.post('/api/user/purchase-plan', authenticateToken, (req: any, res) => {
  try {
    const { plan, amount, percentage } = req.body;
    const userId = req.user.id;

    // 1. Update user plan and percentage
    db.prepare('UPDATE users SET plan = ?, percentage = ? WHERE id = ?').run(plan, percentage, userId);

    // 2. Register transaction for the user
    db.prepare('INSERT INTO transactions (user_id, amount, commission, type) VALUES (?, ?, ?, ?)')
      .run(userId, amount, 0, 'plan_purchase');

    // 3. Check if user has a referrer
    const referral = db.prepare('SELECT referrer_id FROM referrals WHERE referred_id = ?').get(userId) as any;
    
    if (referral) {
      const referrerId = referral.referrer_id;
      const referrer = db.prepare('SELECT percentage FROM users WHERE id = ?').get(referrerId) as any;
      
      if (referrer) {
        const commissionAmount = (amount * referrer.percentage) / 100;
        
        // Register commission for the referrer
        db.prepare('INSERT INTO transactions (user_id, referred_id, amount, commission, type) VALUES (?, ?, ?, ?, ?)')
          .run(referrerId, userId, amount, commissionAmount, 'referral_commission');
          
        // Give XP to referrer for active referral (200 XP)
        processXpGain(referrerId, 200);
      }
    }

    const updatedUser = db.prepare('SELECT id, name, email, plan, level, xp, percentage, referral_code FROM users WHERE id = ?').get(userId) as any;
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Purchase Plan Error:', error);
    res.status(500).json({ error: 'Error al procesar la compra' });
  }
});

// User: Update Plan
app.post('/api/user/plan', authenticateToken, (req: any, res) => {
  try {
    const { plan, percentage } = req.body;
    
    db.prepare('UPDATE users SET plan = ?, percentage = ? WHERE id = ?').run(plan, percentage, req.user.id);
    
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Update Plan Error:', error);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
});

// User: Get Transactions
app.get('/api/transactions', authenticateToken, (req: any, res) => {
  try {
    const transactions = db.prepare(`
      SELECT t.*, u.name as referred_name
      FROM transactions t
      LEFT JOIN users u ON t.referred_id = u.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id);
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

// User: Request Withdrawal
app.post('/api/withdraw', authenticateToken, (req: any, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    // 1. Calculate current balance
    const earnings = db.prepare('SELECT SUM(commission) as total FROM transactions WHERE user_id = ? AND type = "referral_commission"').get(userId) as any;
    const withdrawals = db.prepare('SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = "withdrawal"').get(userId) as any;
    
    const balance = (earnings?.total || 0) - (withdrawals?.total || 0);

    if (amount > balance) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    if (amount < 10000) {
      return res.status(400).json({ error: 'El monto mínimo de retiro es $10.000' });
    }

    // 2. Register withdrawal transaction
    db.prepare('INSERT INTO transactions (user_id, amount, commission, type) VALUES (?, ?, ?, ?)')
      .run(userId, amount, 0, 'withdrawal');

    res.json({ success: true, message: 'Retiro procesado con éxito' });
  } catch (error) {
    console.error('Withdrawal Error:', error);
    res.status(500).json({ error: 'Error al procesar el retiro' });
  }
});

// AI Mentor: Gemini Integration
app.post('/api/mentor/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: 'Eres el Mentor Financiero IA de ImpulsaRed. Tu objetivo es ayudar a los usuarios a crecer su red de referidos, motivarlos a completar sus tareas diarias, darles estrategias de ventas y explicarles cómo subir de nivel para alcanzar el 70% de comisión. Sé entusiasta, profesional y motivador. Usa un tono de líder de equipo.',
      }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Gemini Error:', error);
    res.status(500).json({ error: 'Error comunicando con el Mentor IA' });
  }
});

// --- TASKS & GAMIFICATION ---

// Get User Tasks
app.get('/api/tasks', authenticateToken, (req: any, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, 
      CASE WHEN ut.user_id IS NOT NULL THEN 1 ELSE 0 END as completed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ?
    `).all(req.user.id);
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// Complete Task
app.post('/api/tasks/complete', authenticateToken, (req: any, res) => {
  const { taskId } = req.body;
  
  try {
    // 1. Check if already completed
    const alreadyCompleted = db.prepare('SELECT 1 FROM user_tasks WHERE user_id = ? AND task_id = ?').get(req.user.id, taskId);
    if (alreadyCompleted) {
      return res.status(400).json({ error: 'Tarea ya completada' });
    }

    // 2. Get task info
    const task = db.prepare('SELECT xp FROM tasks WHERE id = ?').get(taskId) as any;
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

    // 3. Mark as completed
    db.prepare('INSERT INTO user_tasks (user_id, task_id) VALUES (?, ?)').run(req.user.id, taskId);

    // 4. Update User XP and Level
    const result = processXpGain(req.user.id, task.xp);

    res.json({
      success: true,
      xpGained: task.xp,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      newPercentage: result.newPercentage,
      newXp: result.newXp
    });
  } catch (error) {
    console.error('Complete Task Error:', error);
    res.status(500).json({ error: 'Error al completar tarea' });
  }
});

// --- TRAINING ---

// Get completed courses
app.get('/api/training/completed', authenticateToken, (req: any, res) => {
  try {
    const courses = db.prepare('SELECT course_id FROM user_courses WHERE user_id = ?').all(req.user.id);
    res.json(courses.map((c: any) => c.course_id));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cursos completados' });
  }
});

// Complete course
app.post('/api/training/complete', authenticateToken, (req: any, res) => {
  const { courseId, xp } = req.body;
  
  try {
    // Check if already completed
    const alreadyCompleted = db.prepare('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?').get(req.user.id, courseId);
    if (alreadyCompleted) {
      return res.status(400).json({ error: 'Curso ya completado' });
    }

    // Mark as completed
    db.prepare('INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)').run(req.user.id, courseId);

    // Update User XP and Level
    const result = processXpGain(req.user.id, xp || 150);

    res.json({
      success: true,
      xpGained: xp || 150,
      leveledUp: result?.leveledUp,
      newLevel: result?.newLevel,
      newPercentage: result?.newPercentage,
      newXp: result?.newXp
    });
  } catch (error) {
    console.error('Complete Course Error:', error);
    res.status(500).json({ error: 'Error al completar curso' });
  }
});

// --- RANKING ---

// Get global leaderboard
app.get('/api/ranking', authenticateToken, (req: any, res) => {
  try {
    const leaderboard = db.prepare(`
      SELECT id, name, level, xp, plan, percentage 
      FROM users 
      WHERE role != 'admin'
      ORDER BY level DESC, xp DESC 
      LIMIT 50
    `).all();
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Ranking Error:', error);
    res.status(500).json({ error: 'Error al obtener el ranking' });
  }
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  await seedAdmin();
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
