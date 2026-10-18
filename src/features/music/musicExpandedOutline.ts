/**
 * A single closed path aligned to the expanded music panel's CSS border.
 * SVG viewBox uses actual client pixels, so it cannot stretch the perimeter.
 */
export function expandedMusicOutline(width: number, height: number): string {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 5 || height <= 5) {
    return '';
  }
  const left = 1.5;
  const top = 1.5;
  const right = width - left;
  const bottom = height - top;
  const radius = Math.min(10.5, (right - left) / 2, (bottom - top) / 2);

  // Begin at top-left after the corner. Four circular arcs follow the
  // clockwise outline. The browser supplies the precise total length.
  return [
    `M ${left + radius} ${top}`,
    `H ${right - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${top + radius}`,
    `V ${bottom - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`,
    `H ${left + radius}`,
    `A ${radius} ${radius} 0 0 1 ${left} ${bottom - radius}`,
    `V ${top + radius}`,
    `A ${radius} ${radius} 0 0 1 ${left + radius} ${top}`,
    'Z',
  ].join(' ');
}
