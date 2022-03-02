import { spawn, spawnSync } from 'child_process';
import * as vscode from 'vscode';

const sfHome =
	'/Users/drewbrokke/Documents/liferay/liferay-portal/tools/sdk/dist';
const sfPath = `${sfHome}/com.liferay.source.formatter.standalone-1.0.1.jar`;

export class DocumentFormattingEditProviderImpl
	implements vscode.DocumentFormattingEditProvider
{
	async provideDocumentFormattingEdits(
		document: vscode.TextDocument,
		options: vscode.FormattingOptions,
		token: vscode.CancellationToken,
	): Promise<vscode.TextEdit[] | undefined> {
		let text = '';

		try {
			const javaProcess = spawn(
				'java',
				[
					// '-Xdebug',
					// '-Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=5005',
					'-jar',
					sfPath,
					'-Dcommit.count=0',
					'-Dsource.auto.fix=false',
					'-Dshow.debug.information=true',
					`-Dsource.files=${document.fileName}`,
				],
				{
					cwd: sfHome,
				},
			);

			for await (const chunk of javaProcess.stdout) {
				text += chunk;
			}
		} catch (error) {
			const err = error as Error;
			console.error(err);

			vscode.window.showInformationMessage(err.message);

			return;
		}

		const sfOutput = text.trim();

		console.log(sfOutput);

		const textEdits = [];

		// line 44 was deleted
		const lineRemovedRegex = new RegExp(/.* line (\d+) was deleted/g);
		for (const match of sfOutput.matchAll(lineRemovedRegex)) {
			const deletedLine = Number(match[1]);

			textEdits.push(
				vscode.TextEdit.delete(
					new vscode.Range(
						new vscode.Position(deletedLine - 1, 0),
						new vscode.Position(deletedLine, 0),
					),
				),
			);
		}

		// lines 39-40 were deleted
		const linesRemovedRegex = new RegExp(
			/.* lines (\d+)-(\d+) were deleted/g,
		);
		for (const match of sfOutput.matchAll(linesRemovedRegex)) {
			const firstDeletedLine = Number(match[1]);
			const lastDeletedLine = Number(match[2]);

			textEdits.push(
				vscode.TextEdit.delete(
					new vscode.Range(
						new vscode.Position(firstDeletedLine - 1, 0),
						new vscode.Position(lastDeletedLine, 0),
					),
				),
			);
		}

		// line 38 was added
		const lineAddedRegex = new RegExp(/.* line (\d+) was added/g);
		for (const match of sfOutput.matchAll(lineAddedRegex)) {
			const addedLine = Number(match[1]);

			textEdits.push(
				vscode.TextEdit.insert(
					new vscode.Position(addedLine - 1, 0),
					'\n',
				),
			);
		}

		// lines 26-30 were added
		const linesAddedRegex = new RegExp(/.* lines (\d+)-(\d+) were added/g);
		for (const match of sfOutput.matchAll(linesAddedRegex)) {
			const firstAddedLine = Number(match[1]);
			const lastAddedLine = Number(match[2]);

			const totalLinesAdded = lastAddedLine - firstAddedLine;

			textEdits.push(
				vscode.TextEdit.insert(
					new vscode.Position(firstAddedLine - 1, 0),
					'\n'.repeat(totalLinesAdded),
				),
			);
		}

		const lineChangedRegex = new RegExp(
			/^.* line (\d+) changed:\nbefore:((?:\n^\[.*\]$)+)\nafter:((?:\n^\[.*\]$)+)/gm,
		);
		for (const match of sfOutput.matchAll(lineChangedRegex)) {
			const changedLine = Number(match[1]);
			const oldText = match[2].trim().replace(/[\[\]]/g, '');
			const newText = match[3].trim().replace(/[\[\]]/g, '');

			const numberOfChangedLines = oldText.split('\n').length;

			textEdits.push(
				vscode.TextEdit.replace(
					new vscode.Range(
						new vscode.Position(changedLine - 1, 0),
						new vscode.Position(
							changedLine - 1 + numberOfChangedLines,
							0,
						),
					),
					`${newText}\n`,
				),
			);
		}

		textEdits.sort((a, b) => {
			if (a.range.start.isBefore(b.range.start)) {
				return 1;
			} else if (a.range.start.isAfter(b.range.start)) {
				return -1;
			} else {
				return 0;
			}
		});

		console.log('edits compiled');

		return textEdits;
	}
}
