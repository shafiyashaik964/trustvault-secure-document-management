
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

// Authentication pages
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

// Admin and Document Owner dashboards
import AdminDashboard from "./pages/AdminDashboard.jsx";
import DocumentOwnerDashboard from "./pages/document-owner/DocumentOwnerDashboard.jsx";

// Viewer pages
import ViewerDashboard from "./pages/viewer/ViewerDashboard.jsx";
import ViewerSetting from "./pages/viewer/ViewerSetting.jsx";

// Get logged-in user
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
}

// Redirect according to user role
function getHomePath(user) {
  if (!user) return "/login";

  if (user.role === "admin") return "/admin";
  if (user.role === "document_owner") return "/document-owner";
  if (user.role === "viewer") return "/viewer";

  return "/login";
}

// Protected route
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("access_token");
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getHomePath(user)} replace />;
  }

  return children;
}

// Public route
function PublicOnlyRoute({ children }) {
  const token = localStorage.getItem("access_token");
  const user = getStoredUser();

  if (token && user) {
    return <Navigate to={getHomePath(user)} replace />;
  }

  return children;
}

// Shared document workspace
function WorkspaceRoute() {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "document_owner") {
    return <DocumentOwnerDashboard />;
  }

  if (user.role === "viewer") {
    return <ViewerDashboard />;
  }

  return <Navigate to={getHomePath(user)} replace />;
}

// Main App
function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />

        {/* REGISTER */}
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />

        {/* ADMIN DASHBOARD */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/documents"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/permissions"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/security"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* DOCUMENT OWNER DASHBOARD */}
        <Route
          path="/document-owner"
          element={
            <ProtectedRoute allowedRoles={["document_owner"]}>
              <DocumentOwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner/permissions"
          element={
            <ProtectedRoute allowedRoles={["document_owner"]}>
              <DocumentOwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner/audit"
          element={
            <ProtectedRoute allowedRoles={["document_owner"]}>
              <DocumentOwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner/settings"
          element={
            <ProtectedRoute allowedRoles={["document_owner"]}>
              <DocumentOwnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* VIEWER DASHBOARD */}
        <Route
          path="/viewer"
          element={
            <ProtectedRoute allowedRoles={["viewer"]}>
              <ViewerDashboard />
            </ProtectedRoute>
          }
        />

        {/* VIEWER SETTINGS */}
        <Route
          path="/viewer/settings"
          element={
            <ProtectedRoute allowedRoles={["viewer"]}>
              <ViewerSetting />
            </ProtectedRoute>
          }
        />

        {/* DOCUMENT WORKSPACE */}
        <Route
          path="/documents"
          element={
            <ProtectedRoute allowedRoles={["document_owner", "viewer"]}>
              <WorkspaceRoute />
            </ProtectedRoute>
          }
        />

        {/* SHARED WITH ME */}
        <Route
          path="/shared"
          element={
            <ProtectedRoute allowedRoles={["document_owner", "viewer"]}>
              <WorkspaceRoute />
            </ProtectedRoute>
          }
        />

        {/* DASHBOARD REDIRECTION */}
        <Route
          path="/dashboard"
          element={
            <Navigate
              to={getHomePath(getStoredUser())}
              replace
            />
          }
        />

        {/* HOME */}
        <Route
          path="/"
          element={
            <Navigate
              to={getHomePath(getStoredUser())}
              replace
            />
          }
        />

        {/* UNKNOWN ROUTES */}
        <Route
          path="*"
          element={
            <Navigate
              to={getHomePath(getStoredUser())}
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
