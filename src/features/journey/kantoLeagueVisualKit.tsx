type MarkProps = {
  className?: string;
};

export function KantoLeagueSeal({ className = '' }: MarkProps) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="53" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="60" cy="60" r="43" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.58" />
      <path d="M39 31v58M41 60 76 30M41 60l37 30" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25 60h70" fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.55" />
      <circle cx="60" cy="60" r="6.5" fill="currentColor" />
      <circle cx="60" cy="60" r="2.5" fill="var(--kanto-paper, #f4eee2)" />
      <path d="M60 12v8M60 100v8M12 60h8M100 60h8" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function KantoRegistrationMark({ className = '' }: MarkProps) {
  return (
    <svg className={className} viewBox="0 0 72 72" aria-hidden="true">
      <path d="M13 57V15h30l16 16v26H13Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M43 15v16h16M23 27h11M23 37h25M23 47h18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="52" cy="49" r="8" fill="var(--kanto-paper, #f4eee2)" stroke="currentColor" strokeWidth="3" />
      <path d="m48 49 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KantoRouteStamp({ className = '' }: MarkProps) {
  return (
    <svg className={className} viewBox="0 0 164 42" aria-hidden="true">
      <path d="M8 21h148" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <circle cx="22" cy="21" r="8" fill="var(--kanto-paper, #f4eee2)" stroke="currentColor" strokeWidth="3" />
      <circle cx="82" cy="21" r="5" fill="currentColor" />
      <path d="m142 12 10 9-10 9-10-9 10-9Z" fill="var(--kanto-paper, #f4eee2)" stroke="currentColor" strokeWidth="3" />
      <path d="M35 21h34M94 21h34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function KantoSecurityRosette({ className = '' }: MarkProps) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path d="m50 7 9 12 15-5 2 15 15 3-6 14 11 10-11 10 6 14-15 3-2 15-15-5-9 12-9-12-15 5-2-15-15-3 6-14L4 56l11-10-6-14 15-3 2-15 15 5 9-12Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="50" cy="56" r="23" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.66" />
      <path d="M37 57h26M50 44v25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="56" r="6" fill="currentColor" />
    </svg>
  );
}

export function KantoBannerTrace({ className = '' }: MarkProps) {
  return (
    <svg className={className} viewBox="0 0 560 150" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-8 118C74 62 125 137 209 78s128-3 191-40 104-6 168-27" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.28" />
      <path d="M-4 132C83 82 150 155 232 100s123 5 193-34 101-5 145-24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.34" />
      <circle cx="74" cy="86" r="8" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.52" />
      <circle cx="208" cy="79" r="6" fill="currentColor" opacity="0.45" />
      <path d="m398 31 12 10-12 10-12-10 12-10Z" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5" />
      <path d="M30 24h86M438 116h90" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
    </svg>
  );
}

export function KantoTrainerPlaceholder({ className = '' }: MarkProps) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M23 78c4-17 14-27 27-27s23 10 27 27" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="35" r="15" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M24 22h52" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.55" />
      <path d="M50 8v8M18 50h8M74 50h8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
    </svg>
  );
}
