import { createHash } from 'crypto';
import { getABExperimentBucket } from '../index';
import { bucketOf } from '../bucket';
import { sha256 } from '../sha256';

// 0.1.x's bucketing, verbatim, as the reference for legacyHashing.
const legacyBucket = (uniqueId: string) => {
	const hashBytes = createHash('sha256').update(uniqueId).digest();
	const hashedId = BigInt(
		`0x${Buffer.from(hashBytes).subarray(0, 8).toString('hex')}`,
	);
	return Math.floor(
		(Number(hashedId) / Number(BigInt('0xFFFFFFFFFFFFFFFF'))) * 10000,
	);
};

const ids = Array.from({ length: 20000 }, (_, i) => `user-${i}`);

describe('sha256', () => {
	test('matches Node crypto, including padding boundaries and non-ASCII', () => {
		const inputs = [
			'',
			'abc',
			'a'.repeat(55),
			'a'.repeat(56),
			'a'.repeat(63),
			'a'.repeat(64),
			'a'.repeat(1000),
			'ユーザー',
			'😀 emoji',
		];
		for (const input of inputs) {
			expect(Buffer.from(sha256(input)).toString('hex')).toBe(
				createHash('sha256').update(input).digest('hex'),
			);
		}
	});
});

describe('legacyHashing', () => {
	test('reproduces 0.1.x buckets exactly', () => {
		for (const id of ids) expect(bucketOf(id)).toBe(legacyBucket(id));
	});

	test('ignores experimentName, as 0.1.x did', () => {
		const a = getABExperimentBucket({
			experimentName: 'a',
			uniqueId: 'user-7',
			legacyHashing: true,
		});
		const b = getABExperimentBucket({
			experimentName: 'b',
			uniqueId: 'user-7',
			legacyHashing: true,
		});
		expect(a.resolvedVariant).toBe(b.resolvedVariant);
	});
});

describe('per-experiment bucketing', () => {
	test('is deterministic and pinned', () => {
		const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
		expect(users.map((id) => bucketOf(`checkout-cta:${id}`))).toEqual([
			452, 4576, 8877, 7670, 4422,
		]);
		expect(
			users.map(
				(uniqueId) =>
					getABExperimentBucket({
						experimentName: 'checkout-cta',
						uniqueId,
					}).resolvedVariant,
			),
		).toEqual(['control', 'control', 'control', 'control', 'treatment']);
	});

	test('assigns experiments independently', () => {
		let both = 0;
		let same = 0;
		for (const uniqueId of ids) {
			const a = getABExperimentBucket({
				experimentName: 'checkout-cta',
				uniqueId,
			});
			const b = getABExperimentBucket({
				experimentName: 'new-search',
				uniqueId,
			});
			if (a.resolvedVariant === b.resolvedVariant) same++;
			if (
				a.resolvedVariant === 'treatment' &&
				b.resolvedVariant === 'treatment'
			)
				both++;
		}
		expect(Math.abs((both / ids.length) * 100 - 25)).toBeLessThan(1.5);
		expect(Math.abs((same / ids.length) * 100 - 50)).toBeLessThan(1.5);
	});

	test('raising exposure never moves a user between variants', () => {
		for (const uniqueId of ids) {
			const before = getABExperimentBucket({
				experimentName: 'ramp',
				uniqueId,
				exposure: 10,
			}).resolvedVariant;
			if (before === 'ignore') continue;
			const after = getABExperimentBucket({
				experimentName: 'ramp',
				uniqueId,
				exposure: 50,
			}).resolvedVariant;
			expect(after).toBe(before);
		}
	});

	test('raising treatmentSplit only moves users from control to treatment', () => {
		for (const uniqueId of ids) {
			const before = getABExperimentBucket({
				experimentName: 'split',
				uniqueId,
				treatmentSplit: 20,
			}).resolvedVariant;
			const after = getABExperimentBucket({
				experimentName: 'split',
				uniqueId,
				treatmentSplit: 40,
			}).resolvedVariant;
			if (before === 'treatment') expect(after).toBe('treatment');
		}
	});
});

describe('invalid input throws', () => {
	const base = { experimentName: 'exp', uniqueId: 'user-1' };

	test.each([
		['empty uniqueId', { ...base, uniqueId: '' }, 'uniqueId'],
		[
			'non-string uniqueId',
			{ ...base, uniqueId: 42 as unknown as string },
			'uniqueId',
		],
		[
			'empty experimentName',
			{ ...base, experimentName: '' },
			'experimentName',
		],
		[
			'NaN treatmentSplit',
			{ ...base, treatmentSplit: NaN },
			'treatmentSplit',
		],
		[
			'string exposure',
			{ ...base, exposure: '50' as unknown as number },
			'exposure',
		],
		['infinite exposure', { ...base, exposure: Infinity }, 'exposure'],
	])('%s', (_, params, field) => {
		expect(() => getABExperimentBucket(params)).toThrow(field);
	});

	test('legacyHashing allows an empty experimentName', () => {
		expect(
			getABExperimentBucket({
				...base,
				experimentName: '',
				legacyHashing: true,
			}).resolvedVariant,
		).toBe(
			getABExperimentBucket({ ...base, legacyHashing: true })
				.resolvedVariant,
		);
	});
});
