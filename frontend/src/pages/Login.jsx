
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import API from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await API.post("/auth/login", {
        email: email.trim(),
        password: password
      });

      const token = response.data.access_token;

      localStorage.setItem("access_token", token);

      const userResponse = await API.get("/auth/me");
      const user = userResponse.data;

      // CHECK SELECTED ROLE AGAINST BACKEND ROLE

      if (user.role !== selectedRole) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        setError(
          `This account belongs to the ${user.role.replace(
            "_",
            " "
          )} role. Please select the correct role.`
        );

        return;
      }

      // SAVE USER DETAILS

      localStorage.setItem("user", JSON.stringify(user));

      // ROLE-BASED NAVIGATION

      if (user.role === "admin") {
        navigate("/admin", { replace: true });

      } else if (user.role === "document_owner") {
        navigate("/document-owner", { replace: true });

      } else if (user.role === "viewer") {
        navigate("/viewer", { replace: true });

      } else {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        setError("Invalid user role.");
      }

    } catch (err) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      setError(
        err.response?.data?.detail ||
        "Login failed. Please check your credentials."
      );

    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError(
      "Google authentication will be available after OAuth configuration."
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
            Your documents.
            <br />
            Your control.
            <br />
            <span>Your trust.</span>
          </h2>

          <p>
            Share confidential documents securely
            with controlled permissions and a
            verifiable audit trail.
          </p>

          <div className="feature-list">
            <div>✓ Role-based access control</div>
            <div>✓ Secure document sharing</div>
            <div>✓ Activity monitoring</div>
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
            WELCOME BACK
          </span>

          <h2>Sign in to your account</h2>

          <p className="login-description">
            Enter your credentials to access your workspace.
          </p>

          <form onSubmit={handleLogin}>

            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>

            <label>Select Your Role</label>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              required
            >
              <option value="">Choose your role</option>
              <option value="admin">Administrator</option>
              <option value="document_owner">Document Owner</option>
              <option value="viewer">Viewer</option>
            </select>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          <div className="register-link">
            Don't have an account?{" "}
            <Link to="/register">Create Account</Link>
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleLogin}
          >
            <span className="google-icon">G</span>
            Continue with Google
          </button>

          <p className="security-note">
            🔒 Your workspace is protected by secure authentication.
          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;
