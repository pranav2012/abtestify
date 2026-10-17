// Writes test-vectors/vectors.json from the TypeScript implementation.
// Run `yarn build` first, then `node test-vectors/generate.mjs` from the repo root.
// Output is deterministic (seeded PRNG), so CI can regenerate and diff it.
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distEntry = join(root, 'dist', 'index.js');
if (!existsSync(distEntry)) {
	console.error('dist/index.js not found: run `yarn build` first.');
	process.exit(1);
}

// The published entry point decides variants and errors.
const { getABExperimentBucket } = await import(pathToFileURL(distEntry).href);

// bucket.ts is internal to the package, so compile it with esbuild (the
// compiler tsup uses) to reach bucketOf and bucketFromTop.
const bundled = await build({
	entryPoints: [join(root, 'src', 'bucket.ts')],
	bundle: true,
	format: 'esm',
	write: false,
	platform: 'neutral',
});
const { bucketOf, bucketFromTop } = await import(
	`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

const TWO_64 = 1n << 64n;
const MAX_U64 = TWO_64 - 1n;

// mulberry32: small seeded PRNG so the file is reproducible.
let seed = 0x5eed1234;
const random = () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (items) => items[Math.floor(random() * items.length)];
const randomU64 = () => {
	let value = 0n;
	for (let i = 0; i < 4; i++)
		value = (value << 16n) | BigInt(Math.floor(random() * 65536));
	return value;
};
const hex64 = (value) => value.toString(16).padStart(16, '0');

// ---------------------------------------------------------------- bucket cases

const bucketTops = new Map();
const addTop = (value, note) => {
	if (value < 0n || value > MAX_U64) return;
	const key = hex64(value);
	if (!bucketTops.has(key)) bucketTops.set(key, note);
};

const p = (e) => 1n << BigInt(e);
[
	[0n, 'zero'],
	[1n, 'one'],
	[2n, 'two'],
	[3n, 'three'],
	[p(53) - 1n, '2^53-1'],
	[p(53), '2^53'],
	[p(53) + 1n, '2^53+1, tie, rounds down to even'],
	[p(53) + 2n, '2^53+2'],
	[p(53) + 3n, '2^53+3, tie, rounds up to even'],
	[p(54) + 2n, '2^54+2, tie, rounds down to even'],
	[p(54) + 6n, '2^54+6, tie, rounds up to even'],
	[p(63) - 1n, '2^63-1'],
	[p(63), '2^63'],
	[p(63) + 1n, '2^63+1'],
	[p(63) + 1023n, '2^63+1023, below tie'],
	[p(63) + 1024n, '2^63+1024, tie, rounds down to even'],
	[p(63) + 1025n, '2^63+1025, above tie'],
	[p(63) + 1024n + 512n, '2^63+1536, rounds up'],
	[p(63) + 2048n, '2^63+2048'],
	[p(63) + 3072n, '2^63+3072, tie, rounds up to even'],
	[MAX_U64 - 2048n, '2^64-2049'],
	[MAX_U64 - 1024n, '2^64-1025, tie, rounds up to 2^64'],
	[MAX_U64 - 1023n, '2^64-1024'],
	[MAX_U64 - 1025n, '2^64-1026'],
	[MAX_U64, '2^64-1'],
].forEach(([value, note]) => addTop(value, note));

// Ties at every exponent where u64 -> f64 rounds: halfway between two
// neighbouring doubles, with even and odd lower neighbours, and +-1 around them.
for (let e = 53; e < 64; e++) {
	const ulp = p(e - 52);
	for (const j of [0n, 1n, 2n, 3n, 12345n]) {
		const tie = p(e) + j * ulp + ulp / 2n;
		addTop(tie - 1n, `2^${e} tie-1`);
		addTop(tie, `2^${e} tie`);
		addTop(tie + 1n, `2^${e} tie+1`);
	}
}

// Bucket boundaries: the smallest top with bucket >= k (bucketFromTop is
// monotonic, so binary search finds it), the naive ceil(k * 2^64 / 10000),
// and their neighbours.
const firstTopAtLeast = (k) => {
	let lo = 0n;
	let hi = MAX_U64;
	while (lo < hi) {
		const mid = (lo + hi) / 2n;
		if (bucketFromTop(mid) >= k) hi = mid;
		else lo = mid + 1n;
	}
	return lo;
};
const ks = new Set();
for (let k = 1; k <= 120; k++) ks.add(k);
for (let k = 121; k < 9900; k += 47) ks.add(k);
for (const k of [2500, 3333, 4096, 5000, 6667, 7500, 8192]) ks.add(k);
for (let k = 9900; k <= 10000; k++) ks.add(k);
for (const k of [...ks].sort((a, b) => a - b)) {
	const first = firstTopAtLeast(k);
	for (const d of [-2048n, -2n, -1n, 0n, 1n, 2n, 2048n])
		addTop(first + d, `boundary k=${k}`);
	const naive = (BigInt(k) * TWO_64 + 9999n) / 10000n;
	for (const d of [-1n, 0n, 1n]) addTop(naive + d, `naive boundary k=${k}`);
}

for (let i = 0; i < 500; i++) addTop(randomU64(), 'random');

const bucketCases = [...bucketTops.keys()].sort().map((top64Hex) => ({
	top64Hex,
	expectedBucket: bucketFromTop(BigInt(`0x${top64Hex}`)),
}));

// --------------------------------------------------------------- hashing cases

const experimentNames = [
	'checkout-cta',
	'new-search',
	'pricing_v2',
	'exp',
	'a',
	'A/B test #1',
	'ユーザー実験',
	'🧪-experiment',
	'café',
	'café',
	'name:with:colons',
	'  spaced  ',
	'tab\tname',
	'line\nbreak',
	'quote"back\\slash',
	'Привет',
	'مرحبا',
	'中文实验',
	'한국어',
	'x'.repeat(200),
];

const unicodeIds = [
	'ユーザー',
	'ユーザー-123',
	'山田太郎',
	'😀',
	'😀 emoji',
	'👨‍👩‍👧‍👦',
	'🇯🇵',
	'👍🏽',
	'é',
	'é',
	'à́̂̃',
	'Z̤͔ͧ̑̓ä͖̭̈̇lgo',
	'𠜎𠜱𠝹𠱓',
	'​',
	'‍',
	'﻿bom',
	' ',
	'ß',
	'İ',
	'ﬃ',
	'Ω',
	'Ω',
	'\u0000',
	'nul\u0000inside',
	'\u007f',
	'\u0080',
	'߿',
	'ࠀ',
	'￿',
	'\u{10000}',
	'\u{10ffff}',
	'Ünïcödé',
	'Привет мир',
	'مرحبا بالعالم',
	'שלום',
	'नमस्ते',
	'สวัสดี',
	'user:with:colons',
	'a\\b',
	'"quoted"',
	'\r\n',
];

const longIds = [
	...[55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 1000, 10000].map((n) =>
		'a'.repeat(n),
	),
	'ユ'.repeat(1000),
	'😀'.repeat(500),
	'user-'.repeat(300),
	Array.from({ length: 2000 }, (_, i) =>
		String.fromCharCode(0x4e00 + i),
	).join(''),
];

const randomHex = (n) =>
	Array.from({ length: n }, () =>
		Math.floor(random() * 16).toString(16),
	).join('');
const uuid = () =>
	`${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-a${randomHex(3)}-${randomHex(12)}`;

const percentages = [
	0, 0.01, 0.5, 1, 5, 10, 12.345, 20, 25, 33.3, 33.33, 49.5, 50, 50.5, 66.6,
	66.7, 75, 90, 99, 99.5, 99.99, 100,
];
const randomPercentage = () => {
	const r = random();
	if (r < 0.5) return pick(percentages);
	if (r < 0.8) return Math.floor(random() * 101);
	return Math.round(random() * 10000) / 100;
};

const variantNameSets = [
	['treatment', 'control', 'ignore'],
	['treatment', 'control', 'ignore'],
	['treatment', 'control', 'ignore'],
	['B', 'A', 'off'],
	['new-checkout', 'old-checkout', 'not-enrolled'],
	['新', '旧', '対象外'],
	['🅱️', '🅰️', '🚫'],
	['', 'ctrl', 'none'],
];

const hashingCases = [];
const seenCases = new Set();
const addCase = (input) => {
	const params = {
		experimentName: input.experimentName,
		uniqueId: input.uniqueId,
		treatmentSplit: input.treatmentSplit,
		exposure: input.exposure,
		treatmentVariantName: input.treatmentVariantName ?? 'treatment',
		controlVariantName: input.controlVariantName ?? 'control',
		ignoreVariantName: input.ignoreVariantName ?? 'ignore',
		legacyHashing: input.legacyHashing ?? false,
	};
	const dedupe = JSON.stringify(params);
	if (seenCases.has(dedupe)) return;
	seenCases.add(dedupe);

	const result = getABExperimentBucket(params);
	const expectedBucket = bucketOf(
		params.legacyHashing
			? params.uniqueId
			: `${params.experimentName}:${params.uniqueId}`,
	);
	// Recompute the variant from the bucket as a cross-check of dist against src.
	let variant;
	if (expectedBucket / 100 >= params.exposure)
		variant = params.ignoreVariantName;
	else if (expectedBucket % 100 < params.treatmentSplit)
		variant = params.treatmentVariantName;
	else variant = params.controlVariantName;
	if (variant !== result.resolvedVariant)
		throw new Error(`dist and src disagree on ${dedupe}`);
	if (
		result.experimentName !== params.experimentName ||
		result.uniqueId !== params.uniqueId
	)
		throw new Error(`result does not echo inputs for ${dedupe}`);

	hashingCases.push({
		...params,
		expectedBucket,
		expectedVariant: result.resolvedVariant,
	});
};

const randomCase = (uniqueId) => {
	const [treatmentVariantName, controlVariantName, ignoreVariantName] =
		pick(variantNameSets);
	const legacyHashing = random() < 0.2;
	addCase({
		experimentName:
			legacyHashing && random() < 0.4 ? '' : pick(experimentNames),
		uniqueId,
		treatmentSplit: randomPercentage(),
		exposure: random() < 0.4 ? 100 : randomPercentage(),
		treatmentVariantName,
		controlVariantName,
		ignoreVariantName,
		legacyHashing,
	});
};

// The pinned values from bucketing.test.ts.
for (const id of ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'])
	addCase({
		experimentName: 'checkout-cta',
		uniqueId: id,
		treatmentSplit: 50,
		exposure: 100,
	});

for (let i = 0; i < 600; i++) randomCase(`user-${i}`);
for (let i = 0; i < 300; i++) randomCase(uuid());
for (let i = 0; i < 100; i++) randomCase(String(Math.floor(random() * 1e12)));
for (let i = 0; i < 100; i++) randomCase(`${randomHex(6)}@example.com`);
for (const id of unicodeIds) for (let i = 0; i < 8; i++) randomCase(id);
for (const id of longIds) for (let i = 0; i < 6; i++) randomCase(id);

// The same key from different (experimentName, uniqueId) pairs.
addCase({
	experimentName: 'a:b',
	uniqueId: 'c',
	treatmentSplit: 50,
	exposure: 100,
});
addCase({
	experimentName: 'a',
	uniqueId: 'b:c',
	treatmentSplit: 50,
	exposure: 100,
});

// Every combination of the edge percentages for a handful of users.
for (const uniqueId of ['user-1', 'ユーザー', '😀', 'é'])
	for (const treatmentSplit of [0, 33.3, 50, 100])
		for (const exposure of [0, 33.3, 50, 100])
			for (const legacyHashing of [false, true])
				addCase({
					experimentName: 'edges',
					uniqueId,
					treatmentSplit,
					exposure,
					legacyHashing,
				});

// Thresholds placed exactly on, and just around, each user's bucket, so the
// float comparisons `bucket / 100 >= exposure` and `bucket % 100 < split` are
// exercised at equality.
for (let i = 0; i < 150; i++) {
	const experimentName = pick(experimentNames);
	const uniqueId = random() < 0.7 ? `edge-user-${i}` : pick(unicodeIds) + i;
	const legacyHashing = random() < 0.2;
	const bucket = bucketOf(
		legacyHashing ? uniqueId : `${experimentName}:${uniqueId}`,
	);
	const exposures = [
		bucket / 100,
		(bucket + 1) / 100,
		bucket / 100 + 0.001,
		bucket / 100 - 0.001,
	].filter((x) => x >= 0 && x <= 100);
	const splits = [
		bucket % 100,
		(bucket % 100) + 1,
		(bucket % 100) + 0.5,
		(bucket % 100) - 0.5,
	].filter((x) => x >= 0 && x <= 100);
	for (const exposure of exposures)
		addCase({
			experimentName,
			uniqueId,
			treatmentSplit: 50,
			exposure,
			legacyHashing,
		});
	for (const treatmentSplit of splits)
		addCase({
			experimentName,
			uniqueId,
			treatmentSplit,
			exposure: 100,
			legacyHashing,
		});
}

// ----------------------------------------------------------------- error cases

// JSON has no NaN or Infinity, so they are written as these strings.
const special = { NaN: NaN, Infinity: Infinity, '-Infinity': -Infinity };
const decode = (value) => (typeof value === 'string' ? special[value] : value);

const errorCases = [];
const addError = (description, overrides, expectedErrorField) => {
	const entry = {
		description,
		experimentName: 'exp',
		uniqueId: 'user-1',
		treatmentSplit: 50,
		exposure: 100,
		legacyHashing: false,
		...overrides,
		expectedErrorField,
	};
	let message;
	try {
		getABExperimentBucket({
			experimentName: entry.experimentName,
			uniqueId: entry.uniqueId,
			treatmentSplit: decode(entry.treatmentSplit),
			exposure: decode(entry.exposure),
			legacyHashing: entry.legacyHashing,
		});
	} catch (error) {
		message = error.message;
	}
	if (message === undefined || !message.startsWith(`${expectedErrorField} `))
		throw new Error(
			`${description}: expected an error naming ${expectedErrorField}`,
		);
	errorCases.push(entry);
};

for (const field of ['treatmentSplit', 'exposure'])
	for (const value of [
		-1,
		-0.0001,
		100.0001,
		101,
		1e308,
		-1e308,
		'NaN',
		'Infinity',
		'-Infinity',
	])
		addError(`${field} = ${value}`, { [field]: value }, field);
addError('empty uniqueId', { uniqueId: '' }, 'uniqueId');
addError(
	'empty uniqueId with legacyHashing',
	{ uniqueId: '', legacyHashing: true },
	'uniqueId',
);
addError('empty experimentName', { experimentName: '' }, 'experimentName');
addError(
	'treatmentSplit is checked before exposure',
	{ treatmentSplit: 150, exposure: 150 },
	'treatmentSplit',
);
addError(
	'exposure is checked before uniqueId',
	{ exposure: -5, uniqueId: '' },
	'exposure',
);
addError(
	'treatmentSplit is checked before experimentName',
	{ treatmentSplit: 'NaN', experimentName: '' },
	'treatmentSplit',
);
addError(
	'uniqueId is checked before experimentName',
	{ uniqueId: '', experimentName: '' },
	'uniqueId',
);
addError(
	'legacyHashing still validates exposure',
	{ exposure: 'Infinity', experimentName: '', legacyHashing: true },
	'exposure',
);

// ----------------------------------------------------------------------- write

const vectors = {
	description:
		'Shared test vectors for every abtestify port. Generated by test-vectors/generate.mjs from the TypeScript implementation; do not edit by hand.',
	algorithm: {
		key: 'legacyHashing ? uniqueId : experimentName + ":" + uniqueId, UTF-8',
		top: 'first 8 bytes of SHA-256(key), big-endian unsigned 64-bit',
		bucket: 'floor(f64(top) / 18446744073709551616.0 * 10000), f64() rounding to nearest, ties to even',
		variant:
			'bucket / 100 >= exposure ? ignore : bucket % 100 < treatmentSplit ? treatment : control',
		errors: 'treatmentSplit, then exposure (finite, 0..100), then uniqueId (non-empty), then experimentName (non-empty unless legacyHashing)',
		specialNumbers:
			'In errorCases, treatmentSplit and exposure may be the strings "NaN", "Infinity" or "-Infinity".',
	},
	counts: {
		bucketCases: bucketCases.length,
		hashingCases: hashingCases.length,
		errorCases: errorCases.length,
	},
	bucketCases,
	hashingCases,
	errorCases,
};

// One case per line keeps the file small and its diffs readable.
const section = (name, items) =>
	`  ${JSON.stringify(name)}: [\n${items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]`;
const header = Object.entries(vectors)
	.filter(([, value]) => !Array.isArray(value))
	.map(
		([name, value]) =>
			`  ${JSON.stringify(name)}: ${JSON.stringify(value)}`,
	);
writeFileSync(
	join(root, 'test-vectors', 'vectors.json'),
	`{\n${[
		...header,
		section('bucketCases', bucketCases),
		section('hashingCases', hashingCases),
		section('errorCases', errorCases),
	].join(',\n')}\n}\n`,
);
console.log(
	`Wrote ${bucketCases.length} bucket cases, ${hashingCases.length} hashing cases, ${errorCases.length} error cases.`,
);
