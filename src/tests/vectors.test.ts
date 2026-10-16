import { readFileSync } from 'fs';
import { join } from 'path';
import { getABExperimentBucket } from '../index';
import { bucketFromTop, bucketOf } from '../bucket';
import type { IParams } from '../types/interface';

// The shared vectors every port is tested against. If this test fails after a
// deliberate change, regenerate them with `yarn build && yarn vectors`.
interface HashingCase extends Required<IParams> {
	expectedBucket: number;
	expectedVariant: string;
}

interface ErrorCase {
	description: string;
	experimentName: string;
	uniqueId: string;
	treatmentSplit: number | string;
	exposure: number | string;
	legacyHashing: boolean;
	expectedErrorField: string;
}

interface Vectors {
	bucketCases: { top64Hex: string; expectedBucket: number }[];
	hashingCases: HashingCase[];
	errorCases: ErrorCase[];
}

const vectors: Vectors = JSON.parse(
	readFileSync(
		join(__dirname, '..', '..', 'test-vectors', 'vectors.json'),
		'utf8',
	),
);

const special: Record<string, number> = {
	NaN: NaN,
	Infinity: Infinity,
	'-Infinity': -Infinity,
};
const decode = (value: number | string) =>
	typeof value === 'string' ? special[value] : value;

describe('shared test vectors', () => {
	test('has enough cases', () => {
		expect(vectors.bucketCases.length).toBeGreaterThan(1000);
		expect(vectors.hashingCases.length).toBeGreaterThanOrEqual(2000);
		expect(vectors.errorCases.length).toBeGreaterThan(10);
	});

	test('bucket mapping from the top 64 bits', () => {
		for (const { top64Hex, expectedBucket } of vectors.bucketCases)
			expect([top64Hex, bucketFromTop(BigInt(`0x${top64Hex}`))]).toEqual([
				top64Hex,
				expectedBucket,
			]);
	});

	test('hashing and variant assignment', () => {
		for (const {
			expectedBucket,
			expectedVariant,
			...params
		} of vectors.hashingCases) {
			const key = params.legacyHashing
				? params.uniqueId
				: `${params.experimentName}:${params.uniqueId}`;
			expect(bucketOf(key)).toBe(expectedBucket);
			expect(getABExperimentBucket(params)).toEqual({
				experimentName: params.experimentName,
				uniqueId: params.uniqueId,
				resolvedVariant: expectedVariant,
			});
		}
	});

	test.each(vectors.errorCases.map((c) => [c.description, c] as const))(
		'error: %s',
		(_, c) => {
			expect(() =>
				getABExperimentBucket({
					experimentName: c.experimentName,
					uniqueId: c.uniqueId,
					treatmentSplit: decode(c.treatmentSplit),
					exposure: decode(c.exposure),
					legacyHashing: c.legacyHashing,
				}),
			).toThrow(new RegExp(`^${c.expectedErrorField} `));
		},
	);
});
