/**
 * Interface for the parameters required by the getABExperimentBucket function.
 */
export interface IParams {
	experimentName: string; // The name of the experiment
	uniqueId: string; // The unique identifier for the user can be email, user ID, etc.
	treatmentSplit?: number; // The percentage of users to be bucketed into the treatment group (default: 50)
	exposure?: number; // The percentage of users to be bucketed into the experiment (default: 100)
	controlVariantName?: string; // The name of the control variant (default: 'control')
	treatmentVariantName?: string; // The name of the treatment variant (default: 'treatment')
	ignoreVariantName?: string; // The name of the variant to be ignored (default: 'ignore')
}

/**
 * Interface for the experiment data returned by the getABExperimentBucket function.
 */
export interface IExperimentData {
	experimentName: string; // The name of the experiment
	uniqueId: string; // The unique identifier for the user
	resolvedVariant: string | null; // The variant that the user is assigned to, or null if there was an error
	isError?: boolean; // Indicates if there was an error while assigning the variant
	error?: unknown; // The error object, if isError is true
}
