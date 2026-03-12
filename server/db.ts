import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'impulsa_red.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema based on Knowledge Base
const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      google_id TEXT UNIQUE,
      referral_code TEXT UNIQUE,
      role TEXT DEFAULT 'user',
      plan TEXT DEFAULT 'Básico',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      percentage REAL DEFAULT 5.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      referred_id INTEGER,
      amount REAL NOT NULL,
      commission REAL NOT NULL,
      type TEXT NOT NULL, -- 'plan_purchase', 'referral_commission', 'withdrawal'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      xp INTEGER NOT NULL,
      day TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_tasks (
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, task_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS user_courses (
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, course_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS token_blacklist (
      token TEXT PRIMARY KEY,
      invalidated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add role if it doesn't exist
  try {
    db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
  } catch (e) {
    // Column already exists
  }

  // Migration: Add referral_code if it doesn't exist
  try {
    db.exec('ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE');
  } catch (e) {
    // Column already exists
  }

  // Migration: Add type to transactions if it doesn't exist
  try {
    db.exec('ALTER TABLE transactions ADD COLUMN type TEXT DEFAULT \'referral_commission\'');
  } catch (e) {
    // Column already exists
  }


  // Seed initial tasks if empty
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
  if (taskCount.count === 0) {
    const insertTask = db.prepare('INSERT INTO tasks (name, xp, day) VALUES (?, ?, ?)');
    const initialTasks = [
      ['Invitar 2 contactos', 100, 'Lunes'],
      ['Publicar contenido', 100, 'Martes'],
      ['Ver capacitación', 100, 'Miércoles'],
      ['Contactar prospectos', 100, 'Jueves'],
      ['Compartir testimonio', 100, 'Viernes'],
      ['Seguimiento referidos', 100, 'Sábado'],
      ['Planificación semanal', 100, 'Domingo']
    ];
    
    const insertMany = db.transaction((tasks) => {
      for (const task of tasks) insertTask.run(task);
    });
    insertMany(initialTasks);
  }
};

initDb();

export default db;
