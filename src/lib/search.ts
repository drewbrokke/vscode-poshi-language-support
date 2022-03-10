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

export const searchFilesLines = async (
	glob: string,
	search: string,
): Promise<vscode.Location[]> => {
	const files = await vscode.workspace.findFiles(glob);

	const regex = new RegExp(search);
	const results = [];

	for (const file of files) {
		const bytes = await vscode.workspace.fs.readFile(file);

		for await (const chunk of fs.createReadStream(file.fsPath, {
			encoding: 'utf8',
		})) {
            for (const line of chunk.split('\n')) {
                
            }
		}

		const text = bytes.toString();

		const lines = text.split('\n');

		for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
			const line = lines[lineNumber];

			const match = line.match(regex);

			if (match) {
				const captureText = match[1];

				const columnNumber = line.indexOf(captureText);

				results.push(
					new vscode.Location(
						vscode.Uri.file(file.fsPath),
						new vscode.Position(
							Number(lineNumber),
							Number(columnNumber),
						),
					),
				);
			}
		}
	}

	return results;
};
