import * as vscode from 'vscode';

import { isGoToDefinitionEnabled } from '../configurationProvider';
import { getFileLocations, searchFilesLines } from '../search';
import { getToken } from '../tokens';

export class DefinitionProviderImpl implements vscode.DefinitionProvider {
	async provideDefinition(
		document: vscode.TextDocument,
		position: vscode.Position,
	): Promise<vscode.Definition | undefined> {
		if (!isGoToDefinitionEnabled()) {
			return;
		}

		const line = document.lineAt(position);

		const token = getToken(line.text, position.character);

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

				return searchFilesLines(
					`**/${className}.{function,macro}`,
					`(?:macro|function) (${methodName}) \\{`,
				);
			case 'pathFileName':
				return getFileLocations(`**/${token.matches[1]}.path`);
			case 'pathLocator':
				const [, fileName, locatorName] = token.matches;

				return searchFilesLines(
					`**/${fileName}.path`,
					`<td>(${locatorName})</td>`,
				);
		}
	}
}
