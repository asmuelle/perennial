import { describe, expect, test } from 'vitest';
import { createClaim } from './claims';
import type { ClaimInput } from './claims';

const validInput: ClaimInput = {
  id: 'claim-1',
  text: 'Span pinning reduces unsupported-citation errors by 83%.',
  status: 'supported',
  provenance: {
    paperId: 'paper-2605.00321',
    sectionLocator: 'abstract',
    quotedSpan: 'pinning every generated claim to a verbatim quoted span reduces errors by 83%',
  },
  confidence: 'oa_fulltext',
};

describe('createClaim (invariant 2: pinned provenance)', () => {
  test('accepts a claim with full provenance and freezes it', () => {
    // Arrange + Act
    const result = createClaim(validInput);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.provenance)).toBe(true);
    }
  });

  test('rejects a claim with an empty quoted span', () => {
    // Arrange
    const input = { ...validInput, provenance: { ...validInput.provenance, quotedSpan: '   ' } };

    // Act
    const result = createClaim(input);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('quotedSpan');
    }
  });

  test('rejects a claim with an empty paper id', () => {
    // Arrange
    const input = { ...validInput, provenance: { ...validInput.provenance, paperId: '' } };

    // Act
    const result = createClaim(input);

    // Assert
    expect(result.ok).toBe(false);
  });

  test('rejects a claim with an empty section locator', () => {
    // Arrange
    const input = { ...validInput, provenance: { ...validInput.provenance, sectionLocator: '' } };

    // Act
    const result = createClaim(input);

    // Assert
    expect(result.ok).toBe(false);
  });

  test('rejects a claim with empty text', () => {
    // Arrange
    const input = { ...validInput, text: '' };

    // Act
    const result = createClaim(input);

    // Assert
    expect(result.ok).toBe(false);
  });

  test('does not mutate the input provenance object', () => {
    // Arrange
    const provenance = { ...validInput.provenance };

    // Act
    createClaim({ ...validInput, provenance });

    // Assert
    expect(provenance).toEqual(validInput.provenance);
    expect(Object.isFrozen(provenance)).toBe(false);
  });
});
