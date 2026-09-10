import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JourneyPageV2 } from './JourneyPageV2';

describe('JourneyPageV2 fresh trainer identity', () => {
  it('does not render a dangling title separator when the trainer has no title yet', () => {
    const markup = renderToStaticMarkup(<JourneyPageV2 />);

    expect(markup).not.toContain('journey-trainer-title');
    expect(markup).not.toContain('— </span>');
  });
});
