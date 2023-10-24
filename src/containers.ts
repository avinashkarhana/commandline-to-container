import * as vscode from 'vscode';
import { exec } from 'child_process';
import { Configuration } from './configuration';

export class Container extends vscode.TreeItem {
    label: string;
    containerId: string;

    constructor(context: vscode.ExtensionContext, label: string, containerId: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
        this.label = (label === 'Running Containers') ? label : `${label} (${containerId})`;
        this.containerId = containerId;
        this.collapsibleState = collapsibleState || vscode.TreeItemCollapsibleState.None;
        this.iconPath = vscode.Uri.joinPath(context.extensionUri, "resources", "container.svg");
    }

    waitForContainerToBeRunning(containerId: string, containerEngine: string): Thenable<string> {
        return new Promise((resolve, reject) => {
            const inspectCommand = `${containerEngine} inspect --format='{{.State.Running}}' ${containerId}`;
            const MAX_RETRIES = 30;
            let retries = 0;
            const interval = setInterval(() => {
                exec(inspectCommand, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Error: ${error.message}`);
                        reject(error);
                    } else if (stderr) {
                        vscode.window.showErrorMessage(`Error: ${stderr}`);
                        reject(new Error(stderr));
                    } else {
                        if (stdout.trim() === 'true') {
                            clearInterval(interval);
                            resolve(containerId);
                        } else {
                            retries++;
                            if (retries > MAX_RETRIES) {
                                clearInterval(interval);
                                vscode.window.showErrorMessage(`Container ${containerId} did not start within ${MAX_RETRIES} seconds`);
                                reject(new Error(`Container ${containerId} did not start within ${MAX_RETRIES} seconds`));
                            }
                        }
                    }
                });
            }, 1000);
        });
    }

    startContainer(): Thenable<string> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Starting container ${this.containerId}`,
            cancellable: true
        }, (progress, token) => {
            let cancelStartProcess = false;
            let ranStartCommand = false;
            token.onCancellationRequested(() => {
                cancelStartProcess = true;
                if (ranStartCommand) {
                    vscode.window.showInformationMessage(`Can not cancel container ${this.containerId} start process at this point. Please wait for the process to finish.`);
                    progress.report({ increment: 10 });
                }
            });
            return new Promise((resolve, reject) => {
                progress.report({ increment: 25 });
                const configuration = new Configuration();
                const command = `${configuration.getContainerEngine()} start ${this.containerId}`;
                if (cancelStartProcess) {
                    reject("User cancelled container start process.");
                }
                ranStartCommand = true;
                progress.report({ increment: 50 });
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Error: ${error.message}`);
                        reject(error);
                    } else if (stderr) {
                        vscode.window.showErrorMessage(`Error: ${stderr}`);
                        reject(new Error(stderr));
                    } else {
                        this.waitForContainerToBeRunning(this.containerId, configuration.getContainerEngine()).then((containerRunning) => {
                            progress.report({ increment: 100 });
                            resolve(containerRunning);
                        });
                    }
                });
            });
        });
    }

    waitForContainerToExit(containerId: string, containerEngine: string): Thenable<boolean> {
        return new Promise((resolve, reject) => {
            const inspectCommand = `${containerEngine} inspect --format='{{.State.Running}}' ${containerId}`;
            let containerExited = false;
            const MAX_RETRIES = 30;
            let retries = 0;
            const interval = setInterval(() => {
                exec(inspectCommand, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Error: ${error.message}`);
                        reject(error);
                    } else if (stderr) {
                        vscode.window.showErrorMessage(`Error: ${stderr}`);
                        reject(new Error(stderr));
                    } else {
                        if (stdout.trim() === 'false') {
                            clearInterval(interval);
                            containerExited = true;
                            resolve(containerExited);
                        } else {
                            retries++;
                            if (retries > MAX_RETRIES) {
                                clearInterval(interval);
                                vscode.window.showErrorMessage(`Container ${containerId} did not exit within ${MAX_RETRIES} seconds`);
                                reject(new Error(`Container ${containerId} did not exit within ${MAX_RETRIES} seconds`));
                            }
                        }
                    }
                });
            }, 1000);
        });
    }

    exitContainer(): Thenable<boolean> {
        // Get Terminals and kill if any running for this container
        vscode.window.terminals.forEach((terminal) => {
            if (terminal.name === `Terminal at ${this.label}`) {
                terminal.dispose();
                vscode.window.showInformationMessage(`Killed terminal ${terminal.name}`);
            }
        });
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Stopping container ${this.containerId}`,
            cancellable: true
        }, (progress, token) => {
            let cancelExitProcess = false;
            let ranExitCommand = false;

            token.onCancellationRequested(() => {
                cancelExitProcess = true;
                if (ranExitCommand) {
                    vscode.window.showInformationMessage(`Can not cancel container ${this.containerId} exit process at this point. Please wait for the process to finish.`);
                    progress.report({ increment: 10 });
                }
            });
            return new Promise((resolve, reject) => {
                progress.report({ increment: 25 });
                const configuration = new Configuration();
                const command = `${configuration.getContainerEngine()} stop ${this.containerId}`;
                if (cancelExitProcess) {
                    reject(false);
                }
                ranExitCommand = true;
                progress.report({ increment: 50 });
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Error: ${error.message}`);
                        reject(error);
                    } else if (stderr) {
                        vscode.window.showErrorMessage(`Error: ${stderr}`);
                        reject(new Error(stderr));
                    } else {
                        this.waitForContainerToExit(this.containerId, configuration.getContainerEngine()).then((containerExited) => {
                            progress.report({ increment: 100 });
                            resolve(containerExited);
                        });
                    }
                });
            });
        });
    }
}
