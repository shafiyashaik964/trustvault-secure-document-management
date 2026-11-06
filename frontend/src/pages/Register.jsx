import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import API from "../services/api";
import "./Login.css";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    requested_role: "viewer"
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/auth/register", {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        requested_role: form.requested_role
      });

      setMessage(
        response.data.message ||
        "Account created successfully. Please log in."
      );

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    setMessage(
      "Google registration will be available after OAuth configuration."
    );
  };

  return (
    <div className="login-page">

      <div className="login-left">

        <div className="brand">
          <div className="brand-icon">T</div>
          <h1>TrustVault</h1>
        </div>

        <div className="hero-content">

          <span className="eyebrow">
            SECURE DOCUMENT MANAGEMENT
          </span>

          <h2>
            Create your account.
            <br />
            <span>Protect your documents.</span>
          </h2>

          <p>
            Join TrustVault to manage confidential
            documents with secure permissions and
            transparent activity tracking.
          </p>

          <div className="feature-list">
            <div>✓ Secure account registration</div>
            <div>✓ Role-based access control</div>
            <div>✓ Controlled document sharing</div>
          </div>

        </div>

        <p className="copyright">
          © 2026 TrustVault. Secure document sharing.
        </p>

      </div>

      <div className="login-right">

        <div className="login-card">

          <div className="mobile-brand">
            <h1>TrustVault</h1>
          </div>

          <span className="eyebrow">
            CREATE ACCOUNT
          </span>

          <h2>Join TrustVault</h2>

          <p className="login-description">
            Enter your details to create your account.
          </p>

          <form onSubmit={handleRegister}>

            <label>Full Name</label>

            <input
              type="text"
              name="full_name"
              placeholder="Enter your full name"
              value={form.full_name}
              onChange={handleChange}
              minLength={2}
              maxLength={100}
              required
            />

            <label>Email Address</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <label>Password</label>

            <div className="password-wrapper">

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                maxLength={128}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>

            </div>

            <label>Confirm Password</label>

            <div className="password-wrapper">

              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? "🙈" : "👁"}
              </button>

            </div>

            <label>Select Account Role</label>

            <select
              name="requested_role"
              value={form.requested_role}
              onChange={handleChange}
              required
            >
              <option value="viewer">Viewer</option>
              <option value="document_owner">
                Document Owner
              </option>
            </select>

            <p className="role-note">
              Document Owner access requires administrator approval.
              Selecting a role does not automatically grant permissions.
            </p>

            {message && (
              <div className="error-message">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

          </form>

          <div className="back-login-link">
            <Link to="/login">
              ← Back to Login
            </Link>
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleRegister}
          >
            <span className="google-icon">G</span>
            Continue with Google
          </button>

          <div className="register-link">
            Already have an account?{" "}
            <Link to="/login">Sign In</Link>
          </div>

          <p className="security-note">
            🔒 Your account is protected by secure authentication.
          </p>

        </div>

      </div>

    </div>
  );
}

export default Register;