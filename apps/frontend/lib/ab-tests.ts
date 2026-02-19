export interface ABVariantDefinition<TVariant extends string = string> {
  name: TVariant;
  weight: number;
}

export interface ABTestDefinition<TVariant extends string = string> {
  variants: readonly ABVariantDefinition<TVariant>[];
  cookieMaxAgeSeconds?: number;
}

export const AB_TESTS = {
  'cta-button-text': {
    variants: [
      { name: 'A', weight: 50 },
      { name: 'B', weight: 50 },
    ],
    cookieMaxAgeSeconds: 60 * 60 * 24 * 30,
  },
} as const satisfies Record<string, ABTestDefinition>;

export type ABTestKey = keyof typeof AB_TESTS;

export type ABTestVariant<K extends ABTestKey> = (typeof AB_TESTS)[K]['variants'][number]['name'];
