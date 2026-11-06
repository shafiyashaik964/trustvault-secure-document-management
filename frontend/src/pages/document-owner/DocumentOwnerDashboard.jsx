import { useLocation } from "react-router-dom";
import Dashboard from "../Dashboard";
import OwnerSectionPage from "./OwnerSectionPage";

function DocumentOwnerDashboard() {
  const location = useLocation();

  const separatePages = [
    "/owner/permissions",
    "/owner/audit",
    "/owner/settings"
  ];

  if (separatePages.includes(location.pathname)) {
    return <OwnerSectionPage />;
  }

  return <Dashboard />;
}

export default DocumentOwnerDashboard;