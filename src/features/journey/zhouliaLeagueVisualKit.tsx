type MarkProps = {
  className?: string;
};

export function ZhouliaEPrimeMark({ className = '' }: MarkProps) {
  return (
    <img
      className={className}
      src="/assets/journey/zhoulia-e-original.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
