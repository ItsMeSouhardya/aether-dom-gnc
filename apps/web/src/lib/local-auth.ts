import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { safeRouteId } from '../features/studio/scope';

export const sessionCookie = 'aether_session';
export const sessionSeconds = 12 * 60 * 60;
export type LocalUser = { name: string; email: string };
export class AuthError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'AuthError'; }
}
type Account = LocalUser & { salt: string; password_hash: string; failure_count: number; last_failure: number; locked_until: number };
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const validToken = (token?: string): token is string => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
const passwordHash = (password: string, salt: string) => new Promise<Buffer>((accept, reject) => {
  scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, result) => error ? reject(error) : accept(result));
});
const credentials = (value: unknown) => {
  const input = value as Record<string, unknown> | null;
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) throw new AuthError('Enter a valid email and a password with 8–128 characters.', 422);
  return { email, password };
};

export function safeStudioReturn(value: unknown): string {
  if (typeof value !== 'string') return '/studio';
  try {
    const url = new URL(value, 'http://local');
    if (url.origin !== 'http://local' || url.pathname !== '/studio' || url.hash) return '/studio';
    const keys = [...url.searchParams.keys()];
    if (!keys.length) return '/studio';
    const project = url.searchParams.get('projectId'), branch = url.searchParams.get('branchId');
    return keys.length === 2 && keys.includes('projectId') && keys.includes('branchId') && safeRouteId(project) && safeRouteId(branch)
      ? `/studio?${new URLSearchParams({ projectId: project, branchId: branch })}` : '/studio';
  } catch { return '/studio'; }
}

function authPath() {
  if (process.env.AETHER_AUTH_PATH) return resolve(process.env.AETHER_AUTH_PATH);
  return process.env.AETHER_DATABASE_PATH ? resolve(dirname(process.env.AETHER_DATABASE_PATH), 'local-auth.sqlite3') : resolve(process.cwd(), '../../data/local-auth.sqlite3');
}

/** Separate from creative canon: one account for this trusted local workspace. */
export class LocalAuth {
  constructor(private path = authPath(), private now: () => number = Date.now) {}
  private database<T>(operation: (db: DatabaseSync) => T): T {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(this.path);
    try {
      chmodSync(this.path, 0o600);
      db.exec(`PRAGMA busy_timeout=3000;
        CREATE TABLE IF NOT EXISTS account (
          id INTEGER PRIMARY KEY CHECK (id=1), name TEXT NOT NULL, email TEXT NOT NULL,
          salt TEXT NOT NULL, password_hash TEXT NOT NULL,
          failure_count INTEGER NOT NULL DEFAULT 0, last_failure INTEGER NOT NULL DEFAULT 0,
          locked_until INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL
        );`);
      return operation(db);
    } finally { db.close(); }
  }
  private session(db: DatabaseSync): string {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(this.now());
    db.prepare('INSERT INTO sessions(token_hash, expires_at) VALUES (?, ?)').run(digest(token), this.now() + sessionSeconds * 1000);
    db.exec('DELETE FROM sessions WHERE id NOT IN (SELECT id FROM sessions ORDER BY id DESC LIMIT 32)');
    return token;
  }
  status(token?: string): { configured: boolean; user: LocalUser | null } {
    return this.database(db => {
      const configured = !!db.prepare('SELECT id FROM account WHERE id=1').get();
      const user = validToken(token) ? db.prepare('SELECT name, email FROM account JOIN sessions ON account.id=1 WHERE token_hash=? AND expires_at>?').get(digest(token), this.now()) as LocalUser | undefined : undefined;
      return { configured, user: user ? { name: user.name, email: user.email } : null };
    });
  }
  async register(value: unknown): Promise<string> {
    const { email, password } = credentials(value);
    const name = typeof (value as Record<string, unknown>)?.name === 'string' ? String((value as Record<string, unknown>).name).trim() : '';
    if (!name || name.length > 80) throw new AuthError('Enter your name using up to 80 characters.', 422);
    if (this.status().configured) throw new AuthError('This workspace already has an account. Log in instead.', 409);
    const salt = randomBytes(16).toString('hex'), hash = await passwordHash(password, salt);
    return this.database(db => {
      db.exec('BEGIN IMMEDIATE');
      try {
        if (db.prepare('SELECT id FROM account WHERE id=1').get()) throw new AuthError('This workspace already has an account. Log in instead.', 409);
        db.prepare('INSERT INTO account(id,name,email,salt,password_hash) VALUES (1,?,?,?,?)').run(name, email, salt, hash.toString('hex'));
        const token = this.session(db); db.exec('COMMIT'); return token;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    });
  }
  async login(value: unknown): Promise<string> {
    const { email, password } = credentials(value);
    const account = this.database(db => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const current = db.prepare('SELECT * FROM account WHERE id=1').get() as Account | undefined;
        if (!current) throw new AuthError('Create your local account first.', 409);
        if (current.locked_until > this.now()) throw new AuthError('Too many attempts. Wait one minute before trying again.', 429);
        const count = current.last_failure < this.now() - 60000 ? 1 : current.failure_count + 1;
        db.prepare('UPDATE account SET failure_count=?, last_failure=?, locked_until=? WHERE id=1').run(count, this.now(), count >= 5 ? this.now() + 60000 : 0);
        db.exec('COMMIT');
        return count >= 5 ? null : current;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    });
    if (!account) throw new AuthError('Too many attempts. Wait one minute before trying again.', 429);
    const hash = await passwordHash(password, account.salt);
    if (email !== account.email || !timingSafeEqual(hash, Buffer.from(account.password_hash, 'hex'))) {
      throw new AuthError('The email or password is incorrect.', 401);
    }
    return this.database(db => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const lock = db.prepare('SELECT locked_until FROM account WHERE id=1').get() as { locked_until: number };
        if (lock.locked_until > this.now()) throw new AuthError('Too many attempts. Wait one minute before trying again.', 429);
        db.exec('UPDATE account SET failure_count=0, last_failure=0, locked_until=0 WHERE id=1');
        const token = this.session(db); db.exec('COMMIT'); return token;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    });
  }
  logout(token?: string) { if (validToken(token)) this.database(db => db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token))); }
}
