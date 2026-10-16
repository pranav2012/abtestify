/**
 * Interface for the parameters required by the getABExperimentBucket function.
 */
export interface IParams {
	experimentName: string; // The name of the experiment; part of the hash
	uniqueId: string; // The unique identifier for the user can be email, user ID, etc.
	treatmentSplit?: number; // The percentage of users to be bucketed into the treatment group (default: 50)
	exposure?: number; // The percentage of users to be bucketed into the experiment (default: 100)
	controlVariantName?: string; // The name of the control variant (default: 'control')
	treatmentVariantName?: string; // The name of the treatment variant (default: 'treatment')
	ignoreVariantName?: string; // The name of the variant to be ignored (default: 'ignore')
	/**
	 * Bucket by `uniqueId` alone, as 0.1.x did, so experiments started on
	 * 0.1.x keep their assignments. Every experiment then shares one split,
	 * so use it only to finish those experiments (default: false).
	 */
	legacyHashing?: boolean;
}

/**
 * Interface for the experiment data returned by the getABExperimentBucket function.
 */
export interface IExperimentData {
	experimentName: string; // The name of the experiment
	uniqueId: string; // The unique identifier for the user
	resolvedVariant: string; // The variant that the user is assigned to
	/** @deprecated Invalid input now throws; this is never set. */
	isError?: boolean;
	/** @deprecated Invalid input now throws; this is never set. */
	error?: unknown;
}
