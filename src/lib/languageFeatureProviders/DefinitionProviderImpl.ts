import * as vscode from 'vscode';
import { inRange as _inRange } from 'lodash';

import { ripgrep } from '../ripgrep';
import { isGoToDefinitionEnabled } from '../configurationProvider';

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
		pattern: /[^\w\.]([A-Z][A-Za-z]+)[\(\.]/g,
		type: 'className',
	},
	{
		// matches ClassName.method|Name
		pattern: /[^\w\.]([A-Z][A-Za-z]+)\.([A-Za-z_][A-Za-z]+)/g,
		type: 'methodInvocation',
	},
];

interface Token {
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

const getToken = (
	line: vscode.TextLine,
	position: vscode.Position,
): Token | undefined => {
	for (const { type, pattern } of tokenTypePatternMap) {
		let matches = getTextMatchesUnderCursor(
			line.text,
			position.character,
			new RegExp(pattern),
		);

		if (matches !== undefined) {
			return {
				matches,
				type,
			};
		}
	}
};

const getFileLocations = async (
	glob: string,
): Promise<vscode.Location[] | undefined> => {
	const files = await vscode.workspace.findFiles(glob);

	if (files.length === 0) {
		return;
	}

	return files.map(
		(uri) => new vscode.Location(uri, new vscode.Position(0, 0)),
	);
};

const getMethodLocations = async (
	glob: string,
	search: string,
): Promise<vscode.Location[] | undefined> => {
	const files = await vscode.workspace.findFiles(glob);

	if (files.length === 0) {
		return;
	}

	const lines = await ripgrep({
		search,
		paths: files.map((uri) => uri.fsPath),
		args: ['--vimgrep'],
	});

	return lines.map((s) => {
		const [filepath, lineNumber, columnNumber] = s.split(':');

		return new vscode.Location(
			vscode.Uri.from({
				path: filepath,
				scheme: 'file',
			}),

			new vscode.Position(
				Number(lineNumber) - 1,
				Number(columnNumber) - 1,
			),
		);
	});
};

export class DefinitionProviderImpl implements vscode.DefinitionProvider {
	async provideDefinition(
		document: vscode.TextDocument,
		position: vscode.Position,
	): Promise<vscode.Definition | undefined> {
		if (!isGoToDefinitionEnabled()) {
			return;
		}

		const token = getToken(document.lineAt(position), position);

		if (!token) {
			return;
		}

		switch (token.type) {
			case 'className':
				return getFileLocations(
					`**/${token.matches[1]}.{function,macro}`,
				);
			case 'methodInvocation':
				const [, className, methodName] = token.matches;

				return getMethodLocations(
					`**/${className}.{function,macro}`,
					`(macro|function) ${methodName} `,
				);
			case 'pathFileName':
				return getFileLocations(`**/${token.matches[1]}.path`);
			case 'pathLocator':
				const [, fileName, locatorName] = token.matches;

				return getMethodLocations(
					`**/${fileName}.path`,
					`<td>${locatorName}`,
				);
		}
	}
}
