import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { teacherProfileApi } from "../api/client";

type UserAvatarProps = {
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
};

const sizeClasses = {
  sm: "w-12 h-12 text-sm",
  md: "w-11 h-11 text-sm",
};

export function UserAvatar({ size = "sm", className = "", onClick }: UserAvatarProps) {
  const navigate = useNavigate();
  const { user, avatarVersion } = useAuth();

  const handleClick = onClick ?? (() => navigate("/profile"));
  const initials = user?.initials ?? "??";
  const hasAvatar = user?.has_avatar ?? false;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center font-semibold cursor-pointer ${sizeClasses[size]} ${className}`}
      style={!hasAvatar ? { background: "#38b6ff", color: "#ffffff" } : undefined}
      title="View profile"
    >
      {hasAvatar ? (
        <img
          src={teacherProfileApi.avatarUrl(avatarVersion)}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </button>
  );
}
