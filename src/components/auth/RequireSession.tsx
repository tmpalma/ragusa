import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { consumeReturnPath, peekReturnPath, saveReturnPath } from "../../platform/authSessionStorage";
import { useSession } from "../../state/SessionContext";

export function RequireSession() {
  const { status, session } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  // The magic link lands on the site root. Send the user on to the page that sent them to sign in.
  useEffect(() => {
    if (!session || location.pathname !== "/") return;
    if (peekReturnPath() == null) return;
    navigate(consumeReturnPath(), { replace: true });
  }, [session, location.pathname, navigate]);

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
