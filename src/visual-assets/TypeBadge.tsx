import { TypeIcon } from './TypeIcon';
import './type-assets.css';

type TypeBadgeProps = {
  type: string;
  accent: string;
  compact?: boolean;
  className?: string;
};

export function TypeBadge({ type, accent, compact = false, className = '' }: TypeBadgeProps) {
  const classes = [
    'pokemon-type-badge',
    compact ? 'is-compact' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      style={{ borderColor: `${accent}66`, background: `${accent}18` }}
    >
      <TypeIcon type={type} fallbackColor={accent} />
      <span>{type.toUpperCase()}</span>
    </span>
  );
}
