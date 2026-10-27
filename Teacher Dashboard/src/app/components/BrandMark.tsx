import type { CSSProperties } from "react";
import defaultPlatformLogo from "../../assets/brand-logo.png";
import { useLanguage } from "../i18n";
import { useBrandingOptional } from "../context/BrandingContext";

type BrandMarkProps = {
  /** Image height in px. Width scales automatically. */
  height?: number;
  className?: string;
  style?: CSSProperties;
  /**
   * Use the white/login logo for dark or photo backgrounds
   * (login pages, dark sidebars).
   */
  onDark?: boolean;
  /** Show text-only fallback accessibility label via alt */
  alt?: string;
};

/**
 * Official Lecture Scientifique logo for all portals.
 * Platform (color) logo inside the app; white/login logo on dark surfaces.
 */
export function BrandMark({
  height = 32,
  className,
  style,
  onDark = false,
  alt,
}: BrandMarkProps) {
  const { t } = useLanguage();
  const branding = useBrandingOptional();
  const label = alt ?? t("common.appName");

  const src = onDark
    ? (branding?.loginLogoUrl ?? defaultPlatformLogo)
    : (branding?.platformLogoUrl ?? defaultPlatformLogo);

  // Until a dedicated white login logo is uploaded, invert the color logo on dark surfaces.
  const needsInvert = onDark && !branding?.hasCustomLoginLogo;

  return (
    <img
      src={src}
      alt={label}
      height={height}
      className={className}
      style={{
        height,
        width: "auto",
        maxWidth: "100%",
        display: "block",
        objectFit: "contain",
        objectPosition: "left center",
        alignSelf: "flex-start",
        ...(needsInvert ? { filter: "brightness(0) invert(1)" } : null),
        ...style,
      }}
    />
  );
}
