import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalAuth, safeStudioReturn } from '../src/lib/local-auth';

const directories: string[] = [];
const store = (clock?: () => number) => {
  const directory = mkdtempSync(join(tmpdir(), 'aether-auth-')); directories.push(directory);
  const path = join(directory, 'auth.sqlite3');
  return { auth: new LocalAuth(path, clock), path };
};
const account = { name: 'A creator', email: 'creator@example.test', password: 'a good local password' };
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

it('creates only one account and persists hashed credentials and revocable sessions', async () => {
  const { auth, path } = store();
  expect(auth.status()).toEqual({ configured: false, user: null });
  const token = await auth.register(account);
  expect(new LocalAuth(path).status(token).user).toEqual({ name: account.name, email: account.email });
  const bytes = readFileSync(path);
  expect(bytes.includes(Buffer.from(account.password))).toBe(false);
  expect(bytes.includes(Buffer.from(token))).toBe(false);
  await expect(auth.register(account)).rejects.toMatchObject({ status: 409 });
  auth.logout(token);
  expect(auth.status(token).user).toBeNull();
  expect(auth.status('forged-token').user).toBeNull();
  const signedIn = await auth.login({ email: account.email.toUpperCase(), password: account.password });
  expect(auth.status(signedIn).user?.name).toBe(account.name);
});

it('rejects bad passwords, expires sessions and bounds repeated login attempts', async () => {
  let now = 1000;
  const { auth } = store(() => now);
  const token = await auth.register(account);
  for (let attempt = 0; attempt < 4; attempt++) await expect(auth.login({ email: account.email, password: 'incorrect password' })).rejects.toMatchObject({ status: 401 });
  await expect(auth.login({ email: account.email, password: 'incorrect password' })).rejects.toMatchObject({ status: 429 });
  await expect(auth.login(account)).rejects.toMatchObject({ status: 429 });
  now += 61000;
  const fresh = await auth.login(account);
  expect(auth.status(fresh).user).not.toBeNull();
  now += 12 * 60 * 60 * 1000;
  expect(auth.status(token).user).toBeNull();
  expect(auth.status(fresh).user).toBeNull();
});

it('serializes first-use registration and validates fields', async () => {
  const { auth } = store();
  await expect(auth.register({ ...account, password: 'short' })).rejects.toMatchObject({ status: 422 });
  const results = await Promise.allSettled([auth.register(account), auth.register({ ...account, email: 'other@example.test' })]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(auth.status().configured).toBe(true);
});

it('accepts only local studio return paths and valid saved scope', () => {
  expect(safeStudioReturn('/studio?projectId=project_1&branchId=branch_2')).toBe('/studio?projectId=project_1&branchId=branch_2');
  for (const value of ['https://evil.test', '//evil.test/studio', '/studio/../welcome', '/studio?next=https://evil.test', '/studio?projectId=a&projectId=b&branchId=c', '/studio?projectId=..&branchId=b']) expect(safeStudioReturn(value)).toBe('/studio');
});

it('bounds concurrent guesses before password hashing and cannot clear an intervening lock', async () => {
  for (const correctFirst of [true, false]) {
    const { auth } = store();
    await auth.register(account);
    const good = () => auth.login(account);
    const bad = () => auth.login({ email: account.email, password: 'incorrect password' });
    const calls = [...Array.from({ length: 20 }, () => bad)];
    if (correctFirst) calls.unshift(good); else calls.push(good);
    const results = await Promise.allSettled(calls.map(call => call()));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(0);
    await expect(auth.login(account)).rejects.toMatchObject({ status: 429 });
  }
});
