import { rgPath } from '@vscode/ripgrep';
import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import * as flexsearch from 'flexsearch';

const definitionIndex = new flexsearch.Document({
	preset: 'memory',
	optimize: true,
	document: {
		id: 'id',
		index: ['id', 'className'],
		store: true,
	},
});

export interface DefinitionDocument {
	fsPath: string;
	lineNumber: number;
	columnNumber: number;
	className: string;
	methodName: string;
}

export async function indexDefinitions(workspaceUri: vscode.Uri) {
	const ripgrepProcess = spawn(rgPath, [
		'(macro|function) ([_a-zA-Z]+)',
		'--vimgrep',
		'--only-matching',
		'--glob',
		'*.{function,macro}',
		'--glob',
		'!**/poshi-runner*/**',
		'--replace',
		'$2',
		'--',
		workspaceUri.fsPath,
	]);

	let text = '';
	for await (const chunk of ripgrepProcess.stdout) {
		text += chunk;
	}

	const lines = text.trim().split('\n');

	for (const line of lines) {
		const [fsPath, lineNumber, columnNumber, methodName] = line.split(':');

		const { name } = path.parse(fsPath);

		indexDefinitionDocument({
			className: name,
			columnNumber: Number(columnNumber),
			fsPath,
			lineNumber: Number(lineNumber),
			methodName,
		});
	}
}

const store = new Map<String, DefinitionDocument>();

async function indexDefinitionDocument(definitionDocument: DefinitionDocument) {
	store.set(
		`${definitionDocument.className}.${definitionDocument.methodName}`,
		definitionDocument,
	);
}

export function getDefinitionDocument(className: string, methodName: string) {
	return store.get(`${className}.${methodName}`);
}
