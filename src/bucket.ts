import { sha256 } from './sha256';

export const BUCKETS = 10000;

/**
 * Maps a key to one of 10,000 buckets from the first 8 bytes of its SHA-256.
 * The arithmetic, including the float rounding, matches 0.1.x exactly, so
 * `legacyHashing` reproduces earlier assignments.
 */
export const bucketOf = (key: string): number => {
	const digest = sha256(key);
	let top = BigInt(0);
	for (let i = 0; i < 8; i++) top = (top << BigInt(8)) | BigInt(digest[i]);
	return Math.floor(
		(Number(top) / Number(BigInt('0xFFFFFFFFFFFFFFFF'))) * BUCKETS,
	);
};
