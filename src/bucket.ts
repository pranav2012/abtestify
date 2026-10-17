import { sha256 } from './sha256';

export const BUCKETS = 10000;

const MAX_U64 = Number(BigInt('0xFFFFFFFFFFFFFFFF'));

/**
 * Maps the top 64 bits of a digest to a bucket in [0, 10000]. Number(top)
 * rounds to nearest, ties to even, and Number(2^64 - 1) is exactly 2^64, so
 * every port must reproduce those two roundings to agree with this function.
 */
export const bucketFromTop = (top: bigint): number =>
	Math.floor((Number(top) / MAX_U64) * BUCKETS);

/**
 * Maps a key to one of 10,000 buckets from the first 8 bytes of its SHA-256.
 * The arithmetic, including the float rounding, matches 0.1.x exactly, so
 * `legacyHashing` reproduces earlier assignments.
 */
export const bucketOf = (key: string): number => {
	const digest = sha256(key);
	let top = BigInt(0);
	for (let i = 0; i < 8; i++) top = (top << BigInt(8)) | BigInt(digest[i]);
	return bucketFromTop(top);
};
