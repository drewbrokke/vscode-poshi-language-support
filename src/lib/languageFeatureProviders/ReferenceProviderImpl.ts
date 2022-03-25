import * as vscode from 'vscode';
import * as path from 'path';
import { ripgrepMatches } from '../ripgrep';
import { getToken } from '../tokens';

export class ReferenceProviderImpl implements vscode.ReferenceProvider {
	async provideReferences(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.ReferenceContext,
		_token: vscode.CancellationToken,
	): Promise<vscode.Location[] | undefined> {
		const line = document.lineAt(position);

		const token = getToken(line.text, position.character);

		if (!token) {
			return;
		}

		const workspaceFolder = await vscode.workspace.getWorkspaceFolder(
			document.uri,
		);

		if (!workspaceFolder) {
			return;
		}

		let fileName;
		let methodName;

		switch (token.type) {
			case 'methodDefinition':
				fileName = path.parse(document.fileName).name;
				methodName = token.matches[1];

				break;

			case 'methodInvocation':
				fileName = token.matches[1];
				methodName = token.matches[2];
		}

		if (!!fileName && !!methodName) {
			const matches = await ripgrepMatches({
				search: `${fileName}\.${methodName}`,
				paths: [workspaceFolder?.uri.fsPath],
			});

			return matches.map((ripgrepMatch) => ripgrepMatch.location);
		}
	}
}
