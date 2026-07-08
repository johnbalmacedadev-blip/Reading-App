import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { teacherProfileApi } from "../api/client";

type ProfileAvatarProps = {
  initials: string;
  hasAvatar: boolean;
  onUpload: (file: File) => Promise<void>;
  size?: "sm" | "lg";
};

export function ProfileAvatar({
  initials,
  hasAvatar,
  onUpload,
  size = "lg",
}: ProfileAvatarProps) {
  const { avatarVersion } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isLarge = size === "lg";
  const dimension = isLarge ? 96 : 48;
  const textSize = isLarge ? "text-3xl" : "text-sm";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Change profile photo"
        className="relative rounded-full overflow-hidden shrink-0 group cursor-pointer disabled:cursor-wait"
        style={{ width: dimension, height: dimension }}
      >
        {hasAvatar ? (
          <img
            src={teacherProfileApi.avatarUrl(avatarVersion)}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center font-semibold ${textSize}`}
            style={{ background: "#38b6ff", color: "#ffffff" }}
          >
            {initials}
          </div>
        )}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0, 74, 173, 0.55)" }}
        >
          {uploading ? (
            <Loader2 className="animate-spin text-white" size={isLarge ? 28 : 18} />
          ) : (
            <Camera className="text-white" size={isLarge ? 28 : 18} />
          )}
        </div>
      </button>
    </>
  );
}
