import { describe, expect, test } from '@jest/globals';

import { getToken, Token } from './tokens';

interface TestCase {
	input: string;
	expected: Token;
}

const testCases: TestCase[] = [
	{
		input: 'Test|Case();',
		expected: { matches: ['TestCase(', 'TestCase'], type: 'className' },
	},
	{
		input: '\t\tTest|Case();',
		expected: { matches: ['\tTestCase(', 'TestCase'], type: 'className' },
	},
	{
		input: '\t\tTest|Case.setUpPortalInstance();',
		expected: {
			matches: ['\tTestCase.', 'TestCase'],
			type: 'className',
		},
	},
	{
		input: 'TestCase.setUpPortal|Instance();',
		expected: {
			matches: [
				'TestCase.setUpPortalInstance',
				'TestCase',
				'setUpPortalInstance',
			],
			type: 'methodInvocation',
		},
	},
	{
		input: '\t\tTestCase.setUpPortal|Instance();',
		expected: {
			matches: [
				'\tTestCase.setUpPortalInstance',
				'TestCase',
				'setUpPortalInstance',
			],
			type: 'methodInvocation',
		},
	},
];

describe.each(testCases)('getToken()', ({ input, expected }) => {
	const index = input.indexOf('|');
	const lineText = input.replace('|', '');

	test(`\nText: "${input}"\nReturns token type: "${
		expected.type
	}"\nWith matches: ${expected.matches.join(', ')}`, () => {
		expect(getToken(lineText, index)).toEqual(expected);
	});
});
