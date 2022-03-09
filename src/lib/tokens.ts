import { inRange as _inRange } from 'lodash';
import * as vscode from 'vscode';

type TokenType =
	| 'className'
	| 'methodInvocation'
	| 'pathFileName'
	| 'pathLocator';

const tokenTypePatternMap: {
	pattern: RegExp;
	type: TokenType;
}[] = [
	{
		// matches "PathFile"
		// matches "PathFile|Name.LOCATOR_NAME"
		pattern: /"([A-Z][A-Za-z]+)/g,
		type: 'pathFileName',
	},
	{
		// matches PathFileName.LOCATOR_N|AME
		pattern: /"([A-Z][A-Za-z]+)#([A-Z][A-Z_-]+)"/g,
		type: 'pathLocator',
	},
	{
		// matches: Class|Name
		// matches Class|Name.methodName
		pattern: /(?:^|[^\w\.])([A-Z][A-Za-z]+)[\(\.]/g,
		type: 'className',
	},
	{
		// matches ClassName.method|Name
		pattern: /(?:^|[^\w\.])([A-Z][A-Za-z]+)\.([A-Za-z_][A-Za-z]+)/g,
		type: 'methodInvocation',
	},
];

export interface Token {
	matches: string[];
	type: TokenType;
}

function getTextMatchesUnderCursor(
	lineText: string,
	columnNumber: number,
	regex: RegExp,
): string[] | undefined {
	for (const match of lineText.matchAll(regex)) {
		const { index } = match;

		if (index === undefined) {
			continue;
		}

		if (index === -1) {
			continue;
		}

		if (_inRange(columnNumber, index, index + match[0].length)) {
			return Array.from(match);
		}
	}
}

export const getToken = (
	text: string,
	currentIndex: number,
): Token | undefined => {
	for (const { type, pattern } of tokenTypePatternMap) {
		let matches = getTextMatchesUnderCursor(
			text,
			currentIndex,
			new RegExp(pattern),
		);

		if (matches !== undefined) {
			console.log(
				JSON.stringify({
					input: text,
					expected: {
						matches,
						type,
					},
				}),
			);

			return {
				matches,
				type,
			};
		}
	}
};
