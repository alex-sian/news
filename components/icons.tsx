type IconProps = {
  size?: number;
};

export function MenuIcon({ size = 22 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ size = 22 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function SearchIcon({ size = 20 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function ArrowIcon({ size = 18 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function BookmarkIcon({ size = 19 }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>
      <path d="M6.5 4.5h11v16l-5.5-3.7-5.5 3.7z" />
    </svg>
  );
}
