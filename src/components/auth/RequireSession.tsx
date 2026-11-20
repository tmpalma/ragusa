import { Navigate, Outlet, useLocation } from "react-router";
import { saveReturnPath } from "../../platform/authSessionStorage";
import { useSession } from "../../state/SessionContext";

export function RequireSession() {
  const { status, session } = useSession();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div style={{ padding: "2rem", lineHeight: 1.5 }} role="status">
        Loading…
      </div>
    );
  }

  if (!session) {
    saveReturnPath(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
