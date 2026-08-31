import { describe, expect, it } from 'vitest';
import {
  CATALOG_DRAFT_BACKEND_CONTRACT,
  CATALOG_DRAFT_FORM_SCHEMAS,
  catalogDraftFormSchema,
  EFFECT_PRIMITIVE_FORM_SCHEMAS,
} from './catalog-draft-form-schema';

const resourceKinds = [
  'SPECIES',
  'MOVE',
  'ITEM',
  'AREA',
  'ENCOUNTER_TABLE',
  'REWARD',
  'EFFECT',
] as const;

describe('Content Studio human catalog draft schemas', () => {
  it('tracks the exact backend contract slice used to derive the form layer', () => {
    expect(CATALOG_DRAFT_BACKEND_CONTRACT).toEqual({
      backendHead: '158e431aa3f31b0f3617476888fed7edaf552c44',
      draftContractsBlob: '0c0921b123c8fcb10f0fdaa464b2075152d1124e',
      catalogContractsBlob: 'dc27030d7a2da6557d0655cf0f6b901e1ffc1ba7',
      encounterContractsBlob: 'c681e56b04913a199eeb0c26341400f034e7d651',
      validationBlob: 'a8f81ce5a9ce8761ee74e11fcd6d04d9386bfc1f',
    });
  });

  it('covers every DRAFT resource kind supported by the backend without raw JSON or manual UUID controls', () => {
    expect(Object.keys(CATALOG_DRAFT_FORM_SCHEMAS)).toEqual(resourceKinds);

    for (const kind of resourceKinds) {
      for (const mode of ['create', 'replace'] as const) {
        const schema = catalogDraftFormSchema(kind, mode);
        expect(schema.resourceKind).toBe(kind);
        expect(schema.mode).toBe(mode);
        expect(schema.fields.length).toBeGreaterThan(0);
        expect(schema.fields.every((field) => field.control !== 'raw-json')).toBe(true);
        expect(
          schema.fields
            .filter((field) => field.valueType === 'uuid')
            .every((field) => field.control === 'reference'),
        ).toBe(true);
      }
    }
  });

  it('preserves create-only identity fields instead of pretending immutable identifiers are editable', () => {
    expect(catalogDraftFormSchema('SPECIES', 'create').fields.map((field) => field.key)).toEqual([
      'slug',
      'nationalDex',
      'displayName',
      'catchRate',
      'baseExp',
      'data',
    ]);
    expect(catalogDraftFormSchema('SPECIES', 'replace').fields.map((field) => field.key)).toEqual([
      'displayName',
      'catchRate',
      'baseExp',
      'data',
    ]);
    expect(
      catalogDraftFormSchema('AREA', 'replace').fields.map((field) => field.key),
    ).not.toContain('regionId');
    expect(
      catalogDraftFormSchema('ENCOUNTER_TABLE', 'replace').fields.map((field) => field.key),
    ).not.toContain('areaId');
  });

  it('matches scalar constraints from CatalogDraftCreate/Replace schemas', () => {
    const species = catalogDraftFormSchema('SPECIES', 'create');
    expect(species.field('slug')).toMatchObject({
      control: 'slug',
      required: true,
      constraints: { minLength: 1, maxLength: 96, pattern: '^[a-z0-9][a-z0-9-]*$' },
    });
    expect(species.field('nationalDex')).toMatchObject({
      control: 'integer',
      constraints: { min: 1, max: 65535 },
    });
    expect(species.field('displayName')).toMatchObject({
      constraints: { minLength: 1, maxLength: 160 },
    });
    expect(species.field('catchRate')).toMatchObject({
      nullable: true,
      constraints: { min: 0, max: 1_000_000 },
    });

    const move = catalogDraftFormSchema('MOVE', 'create');
    expect(move.field('typeId')).toMatchObject({
      valueType: 'uuid',
      control: 'reference',
      referenceKind: 'POKEMON_TYPE',
    });
    expect(move.field('category').options).toEqual(['PHYSICAL', 'SPECIAL', 'STATUS']);
    expect(move.field('priority').constraints).toEqual({ min: -32, max: 32 });
    expect(move.field('maxPp')).toMatchObject({
      nullable: true,
      constraints: { min: 1, max: 255 },
    });
  });

  it('models encounter conditions and entries as structured human controls', () => {
    const encounter = catalogDraftFormSchema('ENCOUNTER_TABLE', 'create');
    expect(encounter.field('areaId')).toMatchObject({
      control: 'reference',
      referenceKind: 'AREA',
    });
    expect(encounter.field('conditions')).toMatchObject({
      control: 'encounter-conditions',
      fixedVersion: 1,
      constraints: { maxRequiredUnlockKeys: 32, maxBlockedUnlockKeys: 32 },
    });
    expect(encounter.field('entries')).toMatchObject({
      control: 'encounter-entry-list',
      constraints: { minItems: 1, maxItems: 512 },
    });
    expect(encounter.field('entries').itemSchema).toMatchObject({
      formId: { control: 'reference', referenceKind: 'POKEMON_FORM' },
      weight: { pattern: '^[1-9][0-9]{0,17}$' },
      minLevel: { min: 1, max: 100 },
      maxLevel: { min: 1, max: 100 },
    });
  });

  it('models reward and effect programs without exposing code-shaped editors', () => {
    const reward = catalogDraftFormSchema('REWARD', 'create');
    expect(reward.field('program')).toMatchObject({
      control: 'reward-program',
      fixedVersion: 1,
      constraints: { minItems: 1, maxItems: 32 },
    });
    expect(reward.field('program').variants).toEqual(['ITEM', 'CURRENCY', 'TRAINER_POINTS']);

    const effect = catalogDraftFormSchema('EFFECT', 'create');
    expect(effect.field('scope').options).toEqual([
      'PLAYER',
      'POKEMON',
      'BATTLE_PARTICIPANT',
      'AREA',
    ]);
    expect(effect.field('rules')).toMatchObject({
      control: 'effect-program',
      fixedVersion: 1,
      constraints: { minItems: 1, maxItems: 16 },
    });

    expect(Object.keys(EFFECT_PRIMITIVE_FORM_SCHEMAS)).toEqual([
      'heal-hp',
      'cure-status',
      'restore-pp',
      'catch-modifier',
      'apply-status',
      'apply-status-on-contact-received',
      'modify-stat-stage',
      'low-hp-type-boost',
      'prevent-accuracy-drop',
      'run-away',
    ]);
    expect(EFFECT_PRIMITIVE_FORM_SCHEMAS['heal-hp'].amount).toEqual({
      control: 'integer',
      min: 1,
      max: 9999,
    });
    expect(EFFECT_PRIMITIVE_FORM_SCHEMAS['modify-stat-stage'].stages).toEqual({
      control: 'integer',
      min: -6,
      max: 6,
      disallow: [0],
    });
  });

  it('marks opaque backend extension objects as structured-only, never raw JSON text', () => {
    expect(catalogDraftFormSchema('SPECIES', 'create').field('data')).toMatchObject({
      control: 'structured-object',
      rawJson: false,
    });
    expect(catalogDraftFormSchema('AREA', 'create').field('data')).toMatchObject({
      control: 'structured-object',
      rawJson: false,
    });
    expect(catalogDraftFormSchema('MOVE', 'create').field('effectConfig')).toMatchObject({
      control: 'effect-config',
      rawJson: false,
    });
  });
});
