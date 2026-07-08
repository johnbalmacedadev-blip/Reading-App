import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export function usePortalLogout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return async () => {
    await logout();
    navigate("/");
  };
}
