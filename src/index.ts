import { bucketOf } from './bucket';
import type { IExperimentData, IParams } from './types/interface';

export type { IExperimentData, IParams } from './types/interface';

const assertPercentage = (name: string, value: unknown, meaning: string) => {
	if (
		typeof value !== 'number' ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 100
	) {
		throw new Error(
			`${name} must be a number between 0 and 100 as it represents the percentage of users who will be bucketed into ${meaning}.`,
		);
	}
};

const assertText = (name: string, value: unknown) => {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`${name} must be a non-empty string.`);
	}
};

/**
 * Deterministically assigns a user to a variant of an experiment.
 *
 * The bucket comes from SHA-256 of `experimentName:uniqueId`, so the same
 * user always gets the same variant within an experiment, and independent
 * variants across experiments. Raising `exposure` only adds users; it never
 * moves anyone between variants.
 */
export const getABExperimentBucket = ({
	experimentName,
	uniqueId,
	treatmentSplit = 50,
	exposure = 100,
	treatmentVariantName = 'treatment',
	controlVariantName = 'control',
	ignoreVariantName = 'ignore',
	legacyHashing = false,
}: IParams): IExperimentData => {
	assertPercentage('treatmentSplit', treatmentSplit, 'the treatment group');
	assertPercentage('exposure', exposure, 'the experiment');
	assertText('uniqueId', uniqueId);
	if (!legacyHashing) assertText('experimentName', experimentName);

	const bucket = bucketOf(
		legacyHashing ? uniqueId : `${experimentName}:${uniqueId}`,
	);

	let resolvedVariant: string;
	if (bucket / 100 >= exposure) resolvedVariant = ignoreVariantName;
	else if (bucket % 100 < treatmentSplit)
		resolvedVariant = treatmentVariantName;
	else resolvedVariant = controlVariantName;

	return { experimentName, uniqueId, resolvedVariant };
};
