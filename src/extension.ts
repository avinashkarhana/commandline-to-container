import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { Container } from './containers';
import { RunningContainersProvider } from './runningContainers';
import { ExitedContainersProvider } from './exitedContainers';

const MAX_RETRIES = 10;

let retries = 0;

export function getShellProgram(): string {
	const configuration = vscode.workspace.getConfiguration('commandlineToContainer');
	return configuration.get('shellProgram') || '/bin/sh';
}

export function startTerminal(node: Container): Thenable<boolean> {
	return new Promise((resolve, reject) => {
		const configuration = new Configuration();
		const containerEngine = configuration.getContainerEngine();
		const terminal = vscode.window.createTerminal(`Terminal at ${node.label}`, `${containerEngine}`, ["exec" , "-it" , `${node.containerId}`, `${getShellProgram()}`]);
		if (terminal) {
			terminal.show();
			resolve(true);
		}
		resolve(false);
	});
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "commandline-to-container" is now active!');

	let disposable = vscode.commands.registerCommand('commandline-to-container.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Command to Container!');
	});
	context.subscriptions.push(disposable);

	const exitedContainersProvider = new ExitedContainersProvider(context);
	const runningContainersProvider = new RunningContainersProvider(context);

	vscode.window.registerTreeDataProvider('running-containers-view', runningContainersProvider);
	vscode.commands.registerCommand('running-containers-view.refreshEntry', () => {
		runningContainersProvider.refresh();
		exitedContainersProvider.refresh();
	});
	vscode.commands.registerCommand('running-containers-view.exitContainer', (node: Container) => node.exitContainer().then((result) => {
		if (result) {
			vscode.window.showInformationMessage(`Container ${node.label} stopped`);
		} else {
			vscode.window.showErrorMessage(`Error stopping container ${node.label}`);
			
		}
		runningContainersProvider.refresh();
		exitedContainersProvider.refresh();
	}));
	vscode.commands.registerCommand('running-containers-view.openTerminal', (node: Container) => {
		startTerminal(node).then((result) => {
			if (result) {
				runningContainersProvider.refresh();
			} else {
				vscode.window.showErrorMessage(`Error opening terminal for container ${node.label}`);
				runningContainersProvider.refresh();
			}
			exitedContainersProvider.refresh();
		});
	});

	vscode.window.registerTreeDataProvider('exited-containers-view', exitedContainersProvider);
	vscode.commands.registerCommand('exited-containers-view.refreshEntry', () => {
		exitedContainersProvider.refresh();
		runningContainersProvider.refresh();
	});
	vscode.commands.registerCommand('exited-containers-view.startContainer', (node: Container) => node.startContainer().then((result) => {
		if (result) {
			vscode.window.showInformationMessage(`Container ${node.label} started`);
			startTerminal(node).then((result) => {
				if (result) {
					runningContainersProvider.refresh();
				} else {
					vscode.window.showErrorMessage(`Error opening terminal for container ${node.label}`);
					runningContainersProvider.refresh();
				}
				exitedContainersProvider.refresh();
			});
		} else {
			vscode.window.showErrorMessage(`Error starting container ${node.label}`);
			runningContainersProvider.refresh();
			exitedContainersProvider.refresh();
		}
	}));
}

export function deactivate() { }
