import * as vscode from 'vscode';

import { ripgrep } from '../ripgrep';
import { isGoToDefinitionEnabled } from '../configurationProvider';
import { getToken } from '../tokens';

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
					`<td>${locatorName}</td>`,
				);
		}
	}
}
