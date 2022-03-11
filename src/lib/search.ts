import * as vscode from 'vscode';
import * as fs from 'fs';

export const getFileLocations = async (
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

interface SearchResult {
	location: vscode.Location;
	fullMatchText: string;
	captureMatchText: string;
}

export const searchResultToLocation = (
	searchResult: SearchResult,
): vscode.Location => searchResult.location;

export const searchGlobFilesLines = async (
	glob: string,
	search: string,
): Promise<SearchResult[]> =>
	searchFilesLines(await vscode.workspace.findFiles(glob), search);

export const searchFilesLines = async (
	files: vscode.Uri[],
	search: string,
): Promise<SearchResult[]> => {
	const regex = new RegExp(search);
	const results: SearchResult[] = [];

	for (const file of files) {
		const bytes = await vscode.workspace.fs.readFile(file);

		const text = bytes.toString();

		const lines = text.split('\n');

		for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
			const line = lines[lineNumber];

			const match = line.match(regex);

			if (match) {
				const captureText = match[1];

				const columnNumber = line.indexOf(captureText);

				results.push({
					location: new vscode.Location(
						file,
						new vscode.Position(
							Number(lineNumber),
							Number(columnNumber),
						),
					),
					fullMatchText: match[0],
					captureMatchText: match[1],
				});
			}
		}
	}

	return results;
};
