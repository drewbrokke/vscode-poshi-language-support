import { spawn } from 'child_process';

import { rgPath } from '@vscode/ripgrep';

export interface RipgrepArgs {
	args: string[];
	globs?: string[];
	paths: string[];
	search: string;
}

export async function ripgrep(ripgrepArgs: RipgrepArgs): Promise<string[]> {
	const { args, globs, paths, search } = ripgrepArgs;

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
