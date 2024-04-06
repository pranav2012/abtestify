import * as crypto from 'crypto';
import { IExperimentData, IParams } from '@types';

export const getABExperimentBucket = ({
	experimentName,
	uniqueId,
	treatmentSplit = 50,
	exposure = 100,
	treatmentVariantName = 'treatment',
	controlVariantName = 'control',
	ignoreVariantName = 'ignore',
}: IParams): IExperimentData => {
	if (treatmentSplit < 0 || treatmentSplit > 100) {
		throw new Error(
			'treatmentSplit must be a number between 0 and 100 as it represents the percentage of users who will be bucketed into the treatment group.',
		);
	}
	if (exposure < 0 || exposure > 100) {
		throw new Error(
			'exposure must be a number between 0 and 100 as it represents the percentage of users who will be bucketed into the experiment.',
		);
	}

	try {
		const digest = crypto.createHash('sha256');
		const hashBytes = digest.update(uniqueId).digest(); // Calculate the hash of the ID
		const hashedId = BigInt(
			`0x${Buffer.from(hashBytes).subarray(0, 8).toString('hex')}`,
		); // Convert the hashed ID to a 64-bit BigInt using subarray instead of slice
		const normalizedHashedId =
			Number(hashedId) / Number(BigInt('0xFFFFFFFFFFFFFFFF')); // Convert the hashed ID to a float between 0 and 1
		const randomNum = Math.floor(normalizedHashedId * 10000); // Multiply the normalized hashed ID by 10,000 to get a random number between 0 and 9,999

		if (randomNum / 100 >= exposure)
			return {
				experimentName,
				uniqueId,
				resolvedVariant: ignoreVariantName,
			}; // Check if user should be ignored based on exposure rate

		const resolvedVariant =
			randomNum % 100 < treatmentSplit
				? treatmentVariantName
				: controlVariantName;

		return {
			experimentName,
			uniqueId,
			resolvedVariant,
		};
	} catch (error) {
		return {
			experimentName,
			uniqueId,
			resolvedVariant: null,
			isError: true,
			error,
		};
	}
};
