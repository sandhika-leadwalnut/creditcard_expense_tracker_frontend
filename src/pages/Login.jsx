import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Enter your email and password");
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      nav("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-head">
          <div className="brand-mark lg">₹</div>
          <h2>Sign in</h2>
          <p className="muted">Expense Tracker · LeadWalnut &amp; CodeWalnut</p>
        </div>
        <label>Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@leadwalnut.com" autoFocus />
        </label>
        <label>Password
          <div className="pw">
            <input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
            <button type="button" className="link" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
          </div>
        </label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
