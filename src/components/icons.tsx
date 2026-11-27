import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const CameraIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z" />
    <circle cx="12" cy="13.2" r="3.4" />
  </Icon>
);

export const UploadIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M4.5 15.5v4h15v-4" />
  </Icon>
);

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const DownloadIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 4.5v11M7.5 11 12 15.5 16.5 11M4.5 15.5v4h15v-4" />
  </Icon>
);

export const FlipIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4.5 9.5a7.5 7.5 0 0 1 13.2-3.2L19.5 8M19.5 4v4h-4M19.5 14.5a7.5 7.5 0 0 1-13.2 3.2L4.5 16M4.5 20v-4h4" />
  </Icon>
);

export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

/** Placeholder figure for the person slot. */
export const PersonMark = (p: SVGProps<SVGSVGElement>) => (
  <Icon width="56" height="56" viewBox="0 0 48 48" strokeWidth="1" {...p}>
    <circle cx="24" cy="12" r="5.5" />
    <path d="M10 44V30c0-6 5-9.5 14-9.5S38 24 38 30v14" />
    <path d="M17.5 44V32M30.5 44V32" />
  </Icon>
);

/** Placeholder hanger for the garment slot. */
export const HangerMark = (p: SVGProps<SVGSVGElement>) => (
  <Icon width="56" height="56" viewBox="0 0 48 48" strokeWidth="1" {...p}>
    <path d="M24 17v-2.2c2.600-.6 4.200-2.300 4.200-4.600a4.200 4.200 0 0 0-8.400 0" />
    <path d="M24 17 5.500 31.500c-1.500 1.200-.7 3.500 1.200 3.500h34.600c1.900 0 2.700-2.300 1.200-3.500z" />
  </Icon>
);

/** Placeholder swatch for the fabric step: a square of cloth with one corner turned up. */
export const SwatchMark = (p: SVGProps<SVGSVGElement>) => (
  <Icon width="56" height="56" viewBox="0 0 48 48" strokeWidth="1" {...p}>
    <path d="M8 8h32v22L30 40H8z" />
    <path d="M40 30H30v10" />
    <path d="M8 18h32M8 28h22M18 8v32M28 8v22" opacity=".45" />
  </Icon>
);
