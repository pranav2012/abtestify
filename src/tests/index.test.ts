import { getABExperimentBucket } from '../index';
import { IParams } from 'src/types/interface';

const generateUniqueId = () => {
	return Math.random().toString(36).substring(2);
};

const calculatePercentage = (count: number, total: number) => {
	return (count / total) * 100;
};

describe('getABExperimentBucket function split accuracy', () => {
	const iterations = 100000; // Number of iterations to test

	// Test if split between treatment and control is close to 50:50
	test('Split between treatment and control is close to 50:50', () => {
		let treatmentCount = 0;
		let controlCount = 0;

		for (let i = 0; i < iterations; i++) {
			const mockParams: IParams = {
				experimentName: 'test_experiment',
				uniqueId: generateUniqueId(), // Generate unique ID for each iteration
			};
			const result = getABExperimentBucket(mockParams);
			if (result.resolvedVariant === 'treatment') {
				treatmentCount++;
			} else if (result.resolvedVariant === 'control') {
				controlCount++;
			}
		}

		const percentageTreatment = (treatmentCount / iterations) * 100;
		const percentageControl = (controlCount / iterations) * 100;

		// Allow a tolerance of 1% deviation
		expect(
			Math.abs(percentageTreatment - percentageControl),
		).toBeLessThanOrEqual(1);
	});

	// Test if split between treatment and control is close to 10:90
	test('Split between treatment and control is close to 10:90', () => {
		const iterations = 100000; // Number of iterations to test
		let treatmentCount = 0;

		for (let i = 0; i < iterations; i++) {
			const mockParams: IParams = {
				experimentName: 'test_experiment',
				uniqueId: generateUniqueId(), // Generate unique ID for each iteration
				treatmentSplit: 10,
			};
			const result = getABExperimentBucket(mockParams);
			if (result.resolvedVariant === 'treatment') {
				treatmentCount++;
			}
		}

		const percentageTreatment = calculatePercentage(
			treatmentCount,
			iterations,
		);
		const percentageControl = 100 - percentageTreatment;

		// Allow a tolerance of 1% deviation
		expect(Math.abs(percentageTreatment - 10)).toBeLessThanOrEqual(1);
		expect(Math.abs(percentageControl - 90)).toBeLessThanOrEqual(1);
	});

	// Test if split between treatment and control is close to 70:30
	test('Split between treatment and control is close to 70:30', () => {
		const iterations = 100000; // Number of iterations to test
		let treatmentCount = 0;

		for (let i = 0; i < iterations; i++) {
			const mockParams: IParams = {
				experimentName: 'test_experiment',
				uniqueId: generateUniqueId(), // Generate unique ID for each iteration
				treatmentSplit: 70,
			};
			const result = getABExperimentBucket(mockParams);
			if (result.resolvedVariant === 'treatment') {
				treatmentCount++;
			}
		}

		const percentageTreatment = calculatePercentage(
			treatmentCount,
			iterations,
		);
		const percentageControl = 100 - percentageTreatment;

		// Allow a tolerance of 1% deviation
		expect(Math.abs(percentageTreatment - 70)).toBeLessThanOrEqual(1);
		expect(Math.abs(percentageControl - 30)).toBeLessThanOrEqual(1);
	});

	// Test if exposure of 50% results in only 50% of users getting treatment or control
	test('Exposure of 50% results in 50% of users getting treatment or control', () => {
		let treatmentCount = 0;
		let controlCount = 0;
		let ignoreCount = 0;

		for (let i = 0; i < iterations; i++) {
			const mockParamsWithExposure: IParams = {
				experimentName: 'test_experiment',
				uniqueId: generateUniqueId(), // Generate unique ID for each iteration
				exposure: 50,
			};
			const result = getABExperimentBucket(mockParamsWithExposure);
			if (result.resolvedVariant === 'treatment') {
				treatmentCount++;
			} else if (result.resolvedVariant === 'control') {
				controlCount++;
			} else if (result.resolvedVariant === 'ignore') {
				ignoreCount++;
			}
		}

		const percentageTreatmentControl =
			((treatmentCount + controlCount) / iterations) * 100;
		const percentageIgnore = (ignoreCount / iterations) * 100;

		// Check if percentage of treatment/control is close to 50%
		expect(Math.abs(percentageTreatmentControl - 50)).toBeLessThanOrEqual(
			1,
		);
		// Check if percentage of ignore is close to 50%
		expect(Math.abs(percentageIgnore - 50)).toBeLessThanOrEqual(1);
	});
});

describe('getABExperimentBucket function edge cases and error handling', () => {
	// Test error handling
	test('Error handling', () => {
		// Mocking a function that throws an error
		const mockCryptoCreateHash = jest.spyOn(
			require('crypto'),
			'createHash',
		);
		mockCryptoCreateHash.mockImplementation(() => {
			throw new Error('Crypto error');
		});
		const mockParams: IParams = {
			experimentName: 'test_experiment',
			uniqueId: 'test_user_id', // Generate unique ID for each iteration
		};
		const result = getABExperimentBucket(mockParams);
		expect(result).toEqual({
			experimentName: 'test_experiment',
			uniqueId: 'test_user_id',
			resolvedVariant: null,
			isError: true,
			error: new Error('Crypto error'),
		});

		// Restore the original implementation
		mockCryptoCreateHash.mockRestore();
	});

	// Test edge cases
	test('Edge cases: treatmentSplit and exposure at boundaries', () => {
		const mockParams: IParams = {
			experimentName: 'test_experiment',
			uniqueId: generateUniqueId(), // Generate unique ID for each iteration
		};
		const mockParamsBoundary: IParams = {
			...mockParams,
			treatmentSplit: 0, // minimum
			exposure: 100, // maximum
		};

		const resultBoundary = getABExperimentBucket(mockParamsBoundary);
		expect(resultBoundary.resolvedVariant).toEqual('control');

		const mockParamsMax: IParams = {
			...mockParams,
			treatmentSplit: 100, // maximum
			exposure: 0, // minimum
		};

		const resultMax = getABExperimentBucket(mockParamsMax);
		expect(resultMax.resolvedVariant).toEqual('ignore');
	});

	// Test if error is thrown when treatment split is less than 0
	test('Error is thrown when treatment split is less than 0', () => {
		const mockParams: IParams = {
			experimentName: 'test_experiment',
			uniqueId: generateUniqueId(),
			treatmentSplit: -1,
		};
		expect(() => getABExperimentBucket(mockParams)).toThrow(
			'treatmentSplit must be a number between 0 and 100',
		);
	});

	// Test if error is thrown when treatment split is greater than 100
	test('Error is thrown when treatment split is greater than 100', () => {
		const mockParams: IParams = {
			experimentName: 'test_experiment',
			uniqueId: generateUniqueId(),
			treatmentSplit: 101,
		};
		expect(() => getABExperimentBucket(mockParams)).toThrow(
			'treatmentSplit must be a number between 0 and 100',
		);
	});

	// Test if error is thrown when exposure is less than 0
	test('Error is thrown when exposure is less than 0', () => {
		const mockParams: IParams = {
			experimentName: 'test_experiment',
			uniqueId: generateUniqueId(),
			exposure: -1,
		};
		expect(() => getABExperimentBucket(mockParams)).toThrow(
			'exposure must be a number between 0 and 100',
		);
	});

	// Test if error is thrown when exposure is greater than 100
	test('Error is thrown when exposure is greater than 100', () => {
		const mockParams: IParams = {
			experimentName: 'test_experiment',
			uniqueId: generateUniqueId(),
			exposure: 101,
		};
		expect(() => getABExperimentBucket(mockParams)).toThrow(
			'exposure must be a number between 0 and 100',
		);
	});
});
