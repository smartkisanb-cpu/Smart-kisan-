import { useState } from 'react';
import './role-login.css';

const roles = [
  { value: 'farmer', label: 'Farmer', detail: 'Sell harvests and nursery plants' },
  { value: 'buyer', label: 'Buyer', detail: 'Source verified Indian produce' },
  { value: 'government', label: 'Government', detail: 'Agriculture intelligence and oversight' },
  { value: 'admin', label: 'Admin', detail: 'Platform operations and approvals' },
];

function Mark() {
  return (
    <span className="skb-login-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 21V10" />
        <path d="M12 13C7 13 4 10 4 5c5 0 8 3 8 8Z" />
        <path d="M12 10c0-4 3-7 8-7 0 5-3 8-8 8" />
      </svg>
    </span>
  );
}

export default function RoleLogin({
  onSubmit,
  loading = false,
  error = '',
  configError = '',
}) {
  const [role, setRole] = useState('farmer');
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const canSignUp = role === 'farmer' || role === 'buyer';
  const isProvisionedRole = !canSignUp;
  const messageText = (message) => typeof message === 'string' ? message : message?.message || '';

  const chooseRole = (nextRole) => {
    setRole(nextRole);
    if (nextRole === 'government' || nextRole === 'admin') setMode('signin');
  };

  const submitForm = (event) => {
    event.preventDefault();
    if (loading || configError || (mode === 'signup' && !canSignUp)) return;
    onSubmit?.({
      mode,
      role,
      email: email.trim(),
      password,
      displayName: mode === 'signup' ? displayName.trim() : '',
    });
  };

  const changeMode = (nextMode) => {
    if (nextMode === 'signup' && !canSignUp) return;
    setMode(nextMode);
  };

  return (
    <main className="skb-login-page">
      <div className="skb-login-layout">
        <aside className="skb-login-story" aria-label="Smart Kisan Bharat">
          <div className="skb-login-brand">
            <Mark />
            <span>
              <strong>Smart Kisan</strong>
              <small>भारत · Smart Star Solutions</small>
            </span>
          </div>
          <div className="skb-story-copy">
            <span className="skb-story-kicker"><i /> TRUSTED FARM-TO-MARKET NETWORK</span>
            <h1>Better prices for growers.<br /><em>Better supply for India.</em></h1>
            <p>One verified network connecting harvests, buyers and the teams working for a stronger agricultural economy.</p>
          </div>
          <div className="skb-story-bottom">
            <div className="skb-field-lines" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <span>From Bhuna to Bharat</span>
            <span className="skb-story-seal"><b>VERIFIED</b><small>NETWORK</small></span>
          </div>
        </aside>

        <section className="skb-login-panel" aria-labelledby="skb-login-heading">
          <div className="skb-mobile-brand">
            <Mark />
            <span><strong>Smart Kisan</strong><small>भारत · Smart Star Solutions</small></span>
          </div>
          <div className="skb-panel-heading">
            <span className="skb-panel-eyebrow">YOUR WORKSPACE</span>
            <h2 id="skb-login-heading">{mode === 'signup' ? 'Join the network' : 'Welcome back'}</h2>
            <p>{mode === 'signup' ? 'Create your verified marketplace account.' : 'Sign in to continue to your Smart Kisan workspace.'}</p>
          </div>

          <form className="skb-login-form" onSubmit={submitForm} noValidate={false}>
            <fieldset className="skb-role-fieldset">
              <legend>Choose your role</legend>
              <div className="skb-role-grid">
                {roles.map((item) => (
                  <label className={`skb-role-option${role === item.value ? ' is-selected' : ''}`} key={item.value}>
                    <input
                      type="radio"
                      name="skb-role"
                      value={item.value}
                      checked={role === item.value}
                      onChange={() => chooseRole(item.value)}
                      data-testid={`role-${item.value}`}
                    />
                    <span className="skb-role-radio" aria-hidden="true" />
                    <span className="skb-role-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
                  </label>
                ))}
              </div>
              {isProvisionedRole && (
                <p className="skb-provision-note" data-testid="notice-provisioned-role">
                  Government and Admin access is provisioned by Smart Kisan Bharat. These roles cannot create an account here.
                </p>
              )}
            </fieldset>

            <div className="skb-mode-switch" role="group" aria-label="Account action">
              <button
                type="button"
                className={mode === 'signin' ? 'is-active' : ''}
                aria-pressed={mode === 'signin'}
                onClick={() => changeMode('signin')}
                data-testid="mode-signin"
              >Sign in</button>
              <button
                type="button"
                className={mode === 'signup' ? 'is-active' : ''}
                aria-pressed={mode === 'signup'}
                disabled={!canSignUp}
                onClick={() => changeMode('signup')}
                data-testid="mode-signup"
              >Create account</button>
            </div>

            {mode === 'signup' && (
              <label className="skb-login-field">
                <span>Display name <small>Optional</small></span>
                <input
                  type="text"
                  name="displayName"
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="How should we address you?"
                  data-testid="input-display-name"
                />
              </label>
            )}

            <label className="skb-login-field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.in"
                data-testid="input-email"
              />
            </label>
            <label className="skb-login-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                data-testid="input-password"
              />
            </label>

            {messageText(configError) && (
              <div className="skb-login-alert is-config" role="alert" data-testid="status-config-error">
                <span className="skb-alert-mark" aria-hidden="true">!</span>
                <span><strong>Setup needed</strong>{messageText(configError)}</span>
              </div>
            )}
            {messageText(error) && (
              <div className="skb-login-alert" role="alert" data-testid="status-login-error">
                <span className="skb-alert-mark" aria-hidden="true">!</span>
                <span>{messageText(error)}</span>
              </div>
            )}

            <button
              className="skb-login-submit"
              type="submit"
              disabled={loading || Boolean(configError)}
              data-testid="button-submit"
            >
              {loading ? <><span className="skb-button-loader" aria-hidden="true" /> {mode === 'signup' ? 'Creating account…' : 'Signing in…'}</> : <>{mode === 'signup' ? 'Create farmer / buyer account' : 'Sign in securely'} <span aria-hidden="true">→</span></>}
            </button>
            <p className="skb-login-privacy"><span aria-hidden="true">◇</span> Verified access helps protect every transaction.</p>
          </form>
        </section>
      </div>
    </main>
  );
}