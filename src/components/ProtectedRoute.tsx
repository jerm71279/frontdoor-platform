/**
 * iOPEX AI FrontDoor — ProtectedRoute
 * Uses AuthContext — single auth state, no duplicate session checks.
 * Redirects unauthenticated users to /auth.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const T = { navy: "#0B1120", gold: "#E8A020", muted: "#3D5068" };

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: T.navy,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column" as const, gap: 16,
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
          style={{ animation: "spin 2s linear infinite" }}>
          <polygon points="16,2 29,9 29,23 16,30 3,23 3,9"
            fill="none" stroke={T.gold} strokeWidth="1.5"/>
        </svg>
        <div style={{ color: T.muted, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
          Authenticating…
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
