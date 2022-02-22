// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CompletionItemProviderImpl } from './lib/languageFeatureProviders/CompletionItemProviderImpl';
import { DefinitionProviderImpl } from './lib/languageFeatureProviders/DefinitionProviderImpl';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(
		'Congratulations, your extension "poshi-language-support" is now active!',
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ pattern: '**/*.{function,macro,testcase}' },
			new CompletionItemProviderImpl(context),
			'.',
			' ',
		),
	);
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider(
			{
				pattern: '**/*.{function,macro,testcase}',
			},
			new DefinitionProviderImpl(),
		),
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand(
	// 		'poshi-language-support.helloWorld',
	// 		() => {
	// 			vscode.window.showInformationMessage('old thing6');
	// 		},
	// 	),
	// );
}

// this method is called when your extension is deactivated
export function deactivate() {}
