type MarkProps = {
  className?: string;
};

export function ZhouliaEPrimeMark({ className = '' }: MarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id="zhoulia-e-prime-cutouts">
          <rect width="120" height="120" fill="white" />
          <path
            d="M60 54C60 63 53 67 49 72C45 77 49 80 56 82C63 84 67 88 65 93C63 98 57 101 56 108"
            fill="none"
            stroke="black"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M60 21V58" stroke="black" strokeWidth="3.6" />
        </mask>
      </defs>

      <path
        d="M58.2 5.8 60 2.8l1.8 3 3 1.8-3 1.8-1.8 3-1.8-3-3-1.8 3-1.8Z"
        fill="currentColor"
      />

      <g mask="url(#zhoulia-e-prime-cutouts)" fill="currentColor">
        <path d="M57.5 18 60 14l2.5 4 1.8 45h-8.6l1.8-45Z" />

        <path d="M47 39 54 33v31H43V45l4-6Z" />
        <path d="M36 50 42 45v21H32V55l4-5Z" />
        <path d="M27 60 31 57v12h-8v-6l4-3Z" />

        <path d="M73 39 66 33v31h11V45l-4-6Z" />
        <path d="M84 50 78 45v21h10V55l-4-5Z" />
        <path d="M93 60 89 57v12h8v-6l-4-3Z" />

        <path d="M24 72C35 64 47 61 60 61C73 61 85 64 96 72L89 97C80 102 70 106 60 108C50 106 40 102 31 97L24 72Z" />
      </g>

      <path
        d="M19 71C14 58 15 40 23 27C30 16 41 10 51 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M69 8C79 10 90 16 97 27C105 40 106 58 101 71"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M18 77C19 91 27 102 40 109"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M102 77C101 91 93 102 80 109"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M26 88C34 82 42 79 49 79"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.82"
      />
      <path
        d="M94 88C86 82 78 79 71 79"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.82"
      />
    </svg>
  );
}
