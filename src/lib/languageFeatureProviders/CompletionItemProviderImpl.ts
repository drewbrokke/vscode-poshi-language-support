import * as vscode from 'vscode';
import { rgPath } from '@vscode/ripgrep';
import { spawn } from 'child_process';
import * as _ from 'lodash';

const classNamePattern = /\b[A-Z][A-Za-z]+/g;

function isCompleteProperty(
	lineText: vscode.TextLine,
	position: vscode.Position,
) {
	return lineText.text.trimLeft().startsWith('property');
}

function getFunctionOrMacroFileBaseName(
	lineText: vscode.TextLine,
	position: vscode.Position,
) {
	const matches = lineText.text.matchAll(new RegExp(classNamePattern));

	let result = null;

	for (const match of matches) {
		if (
			match.index &&
			match.index + match[0].length === position.character - 1
		) {
			result = match[0];

			break;
		}
	}

	return result;
}

const getFunctionCompletionItem = (label: string) => {
	const completionItem = new vscode.CompletionItem(
		label,
		vscode.CompletionItemKind.Function,
	);

	const snippetString = new vscode.SnippetString();

	snippetString.appendText(label);
	snippetString.appendText('(');
	snippetString.appendTabstop();
	snippetString.appendText(');');

	completionItem.insertText = snippetString;

	return completionItem;
};

const getPropertyCompletionItem = (label: string) => {
	const completionItem = new vscode.CompletionItem(
		label,
		vscode.CompletionItemKind.Property,
	);

	const snippetString = new vscode.SnippetString();

	snippetString.appendText(label);
	snippetString.appendText(' = "');
	snippetString.appendTabstop();
	snippetString.appendText('";');

	completionItem.insertText = snippetString;

	return completionItem;
};

export class CompletionItemProviderImpl
	implements vscode.CompletionItemProvider
{
	private extensionContext: vscode.ExtensionContext;

	constructor(extensionContext: vscode.ExtensionContext) {
		this.extensionContext = extensionContext;
	}

	async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken,
		context: vscode.CompletionContext,
	): Promise<vscode.CompletionList | undefined> {
		const line: vscode.TextLine = document.lineAt(position);

		if (line.isEmptyOrWhitespace) {
			// Do something with an empty line

			const completionList: vscode.CompletionList =
				new vscode.CompletionList([], false);

			if (position.character === 0) {
				completionList.items.push(
					new vscode.CompletionItem(
						'definition',
						vscode.CompletionItemKind.Keyword,
					),
				);
			} else if (position.character > 0) {
				return new vscode.CompletionList(
					[
						new vscode.CompletionItem(
							'property',
							vscode.CompletionItemKind.Keyword,
						),
						new vscode.CompletionItem(
							'setUp',
							vscode.CompletionItemKind.Keyword,
						),
					],
					false,
				);
			}
			return new vscode.CompletionList(
				[
					new vscode.CompletionItem(
						'property.a',
						vscode.CompletionItemKind.Property,
					),
					new vscode.CompletionItem(
						'property.b',
						vscode.CompletionItemKind.Property,
					),
					new vscode.CompletionItem(
						'property.c',
						vscode.CompletionItemKind.Property,
					),
				],
				false,
			);
		}

		if (context.triggerCharacter === '.') {
			const functionOrMacroFileBaseName = getFunctionOrMacroFileBaseName(
				line,
				position,
			);

			if (!!functionOrMacroFileBaseName) {
				const functionOrMacroNames =
					await this._getFunctionOrMacroNames(
						functionOrMacroFileBaseName,
					);

				return new vscode.CompletionList(
					functionOrMacroNames.map(getFunctionCompletionItem),
					false,
				);
			}
		}

		if (
			context.triggerCharacter === ' ' &&
			isCompleteProperty(line, position)
		) {
			const workspaceFolder = this._getWorkspaceFolder(document);

			if (workspaceFolder) {
				const props = await this._getProps(workspaceFolder.uri);

				return new vscode.CompletionList(
					props.map(getPropertyCompletionItem),
				);
			}
		}
	}

	private async _getProps(workspaceUri: vscode.Uri): Promise<string[]> {
		if (!!this.extensionContext.workspaceState.get('props')) {
			return this.extensionContext.workspaceState.get(
				'props',
			) as string[];
		}

		const ripgrepProcess = spawn(rgPath, [
			'--case-sensitive',
			'--glob',
			'*test.properties',
			'--glob',
			'*portal*.properties',
			'--no-filename',
			'--no-heading',
			'--no-line-number',
			'--only-matching',
			'--replace',
			'$1',
			'^s*([a-z][^#={( ]+?)=',
			'--',
			workspaceUri.fsPath,
		]);

		let text = '';
		for await (const chunk of ripgrepProcess.stdout) {
			text += chunk;
		}

		const props = _.chain(text)
			.split('\n')
			.compact()
			.sort()
			.sortedUniq()
			.value();

		this.extensionContext.workspaceState.update('props', props);

		return props;
	}

	private async _getFunctionOrMacroNames(
		functionOrMacroFileBaseName: string,
	): Promise<string[]> {
		if (
			!!this.extensionContext.workspaceState.get(
				functionOrMacroFileBaseName,
			)
		) {
			return this.extensionContext.workspaceState.get(
				functionOrMacroFileBaseName,
			) as string[];
		}

		const uris: vscode.Uri[] = await vscode.workspace.findFiles(
			`**/${functionOrMacroFileBaseName}.{function,macro}`,
		);

		const ripgrepProcess = spawn(rgPath, [
			'--only-matching',
			'--no-filename',
			'--no-line-number',
			'--replace',
			'$2',
			'(macro|function) ([_a-zA-Z]+)',
			'--',
			uris[0].fsPath,
		]);

		let text = '';
		for await (const chunk of ripgrepProcess.stdout) {
			text += chunk;
		}

		const completionItems = text.split('\n');

		this.extensionContext.workspaceState.update(
			functionOrMacroFileBaseName,
			completionItems,
		);

		return completionItems;
	}

	private _getWorkspaceFolder(
		document: vscode.TextDocument,
	): vscode.WorkspaceFolder | undefined {
		return vscode.workspace.getWorkspaceFolder(document.uri);
	}
}
