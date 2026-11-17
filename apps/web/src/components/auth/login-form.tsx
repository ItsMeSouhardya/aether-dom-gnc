'use client';
import { useState } from 'react';

export function LoginForm({ configured, next }: { configured: boolean; next: string }) {
  const [creating, setCreating] = useState(!configured);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  return <form className="login-form" onSubmit={async event => {
    event.preventDefault(); if (working) return;
    const form = new FormData(event.currentTarget);
    if (creating && form.get('password') !== form.get('confirm')) { setError('The passwords do not match.'); return; }
    setWorking(true); setError('');
    try {
      const response = await fetch(`/api/auth/${creating ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password'), next }), signal: AbortSignal.timeout(10000) });
      const value = await response.json();
      if (!response.ok) { if (response.status === 409 && creating) setCreating(false); throw new Error(typeof value.message === 'string' ? value.message : 'Unable to log in. Please try again.'); }
      if (typeof value.next !== 'string' || !/^\/studio(?:\?|$)/.test(value.next)) throw new Error('Please reload and try logging in again.');
      window.location.assign(value.next);
    } catch (reason) { setError(reason instanceof Error && !['TimeoutError', 'TypeError'].includes(reason.name) ? reason.message : 'The local server did not respond. Please try again.'); }
    finally { setWorking(false); }
  }}>
    <h1>{creating ? 'Create your local account' : 'Welcome back'}</h1>
    <p>{creating ? 'Set up your account to open the studio.' : 'Log in to continue creating.'}</p>
    <fieldset disabled={working}>
      {creating ? <label>Your name<input name="name" autoComplete="name" maxLength={80} required /></label> : null}
      <label>Email<input name="email" type="email" autoComplete="username" maxLength={254} required /></label>
      <label>Password<input name="password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required aria-describedby={creating ? 'password-hint' : undefined} /></label>
      {creating ? <><p id="password-hint" className="login-hint">Use at least 8 characters.</p><label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label></> : null}
      {error ? <p role="alert" aria-label="Login error" className="login-error">{error}</p> : null}
      <button className="login-submit" type="submit">{working ? (creating ? 'Creating account…' : 'Logging in…') : (creating ? 'Create account' : 'Log in')}</button>
    </fieldset>
    <p className="login-local">One account for this local workspace.</p>
  </form>;
}
