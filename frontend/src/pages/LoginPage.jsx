import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bgLogin from "../assets/background-login.png";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Placeholder – sẽ kết nối BE sau
    setTimeout(() => {
      setLoading(false);
      // navigate("/");
    }, 1200);
  };

  return (
    <div className="lp-root">
      {/* Full-page background */}
      <img src={bgLogin} alt="background" className="lp-bg" />

      {/* Centered glass card */}
      <div className="lp-card">
        {/* Logo / brand */}
        <div className="lp-brand">
          <span className="lp-logo-dot" />
          <span className="lp-logo-dot" />
          <span className="lp-logo-dot" />
          <span className="lp-brand-name">AIStudyHub</span>
        </div>

        {/* Heading */}
        <h1 className="lp-title">Hi there!</h1>
        <p className="lp-sub">Have we met before?</p>

        {/* Form */}
        <form onSubmit={handleLogin} className="lp-form" noValidate>
          {/* Email */}
          <div className="lp-field">
            <label htmlFor="lp-email" className="lp-label">Email</label>
            <input
              id="lp-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="lp-input"
            />
          </div>

          {/* Password */}
          <div className="lp-field">
            <label htmlFor="lp-password" className="lp-label">Password</label>
            <div className="lp-input-wrap">
              <input
                id="lp-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="lp-input"
              />
              <button
                type="button"
                className="lp-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot */}
          <div className="lp-row">
            <label className="lp-remember">
              <input
                id="lp-remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="lp-checkbox"
              />
              <span className="lp-checkmark" />
              Remember me
            </label>
            <a href="/forgot-password" className="lp-forgot">Forgot my password</a>
          </div>

          {/* Error */}
          {error && (
            <div className="lp-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Login button */}
          <button id="lp-submit" type="submit" disabled={loading} className="lp-btn">
            {loading ? (
              <span className="lp-spinner-wrap">
                <svg className="lp-spinner" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity=".75"/>
                </svg>
                Logging in…
              </span>
            ) : "Log in"}
          </button>
        </form>

        {/* Divider */}
        <div className="lp-divider"><span>OR</span></div>

        {/* Social buttons */}
        <button id="lp-google" type="button" className="lp-social-btn">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Log in with Google
        </button>



        {/* Sign up link */}
        <p className="lp-signup">
          Don't have an account?{" "}
          <a href="/register" className="lp-signup-link">Sign Up</a>
        </p>
      </div>
    </div>
  );
}
