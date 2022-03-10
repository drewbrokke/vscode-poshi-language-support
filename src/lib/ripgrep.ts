import { spawn } from 'child_process';

import { rgPath } from '@vscode/ripgrep';

export interface RipgrepArgs {
	args?: string[];
	globs?: string[];
	paths: string[];
	search: string;
}

export interface RipgrepMatch {
	filepath: string;
	lineNumber: number;
	columnNumber: number;
}

export async function ripgrep(ripgrepArgs: RipgrepArgs): Promise<string[]> {
	const { args = [], globs, paths, search } = ripgrepArgs;

	const totalArgs = [...args];

	if (!!globs && globs.length) {
		for (const glob of globs) {
			totalArgs.push('--glob', glob);
		}
	}

	const ripgrepProcess = spawn(
		rgPath,
		totalArgs.concat([search, '--', ...paths]),
	);

	let text = '';
	for await (const chunk of ripgrepProcess.stdout) {
		text += chunk;
	}

	return text.trim().split('\n');
}

export async function ripgrepMatches(
	ripgrepArgs: RipgrepArgs,
): Promise<RipgrepMatch[]> {
	const { args = [] } = ripgrepArgs;
	const lines = await ripgrep({
		...ripgrepArgs,
		args: [...args, '--json'],
	});

	return (
		lines
			.map((line) => JSON.parse(line))
			// See https://docs.rs/grep-printer/0.1.6/grep_printer/struct.JSON.html#overview
			.filter((obj) => obj.type === 'match')
			.map((obj) => obj.data)
			.reduce((acc, obj) => {
				// See https://docs.rs/grep-printer/0.1.6/grep_printer/struct.JSON.html#message-match

				for (const submatch of obj.submatches) {
					acc.push({
						filepath: obj.path.text,
						lineNumber: obj.line_number,
						columnNumber: submatch.start,
					});
				}

				return acc;
			}, [])
	);
}
