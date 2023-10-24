import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { Container } from './containers';
import { RunningContainersProvider } from './runningContainers';
import { ExitedContainersProvider } from './exitedContainers';

const MAX_RETRIES = 10;

let retries = 0;

export function startTerminal(node: Container): Promise<string> {
	if (node === undefined || node.containerId === "" || node.containerId === undefined || node.containerId === null) {
		return new Promise((resolve, reject) => {
			vscode.window.showErrorMessage(`Error opening terminal for container ${node.label} : Container ID not found`);
			reject("Container ID not found");
		});
	}
	return new Promise((resolve, reject) => {
		const configuration = new Configuration();
		const containerEngine = configuration.getContainerEngine();
		const shellProgram = configuration.getShellProgram();
		const terminal = vscode.window.createTerminal(`Terminal at ${node.label}`, `${containerEngine}`, ["exec" , "-it" , `${node.containerId}`, `${shellProgram}`]);
		if (terminal) {
			terminal.show();
			resolve(`${node.containerId}`);
		}
		resolve("Can not open terminal");
	});
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "commandline-to-container" is now active!');
	const exitedContainersProvider = new ExitedContainersProvider(context);
	const runningContainersProvider = new RunningContainersProvider(context);

	vscode.commands.registerCommand('commandline-to-container.showCommandlineToContainerSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'commandlineToContainer');
	});

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

	vscode.window.registerTreeDataProvider('commandline-to-container-settings-view', {
		getChildren: () => {
			return [
				{
					label: 'Open settings',
					command: {
						command: 'commandline-to-container.showCommandlineToContainerSettings',
						title: 'Open settings'
					}
				}
			];
		},
		getTreeItem: (element) => {
			return element;
		}
	});

}

export function deactivate() { }
