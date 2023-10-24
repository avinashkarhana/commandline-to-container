import * as vscode from 'vscode';
import { exec } from 'child_process';
import { Configuration } from './configuration';
import { Container } from './containers';

export class ExitedContainersProvider implements vscode.TreeDataProvider<Container> {

    private exitedContainers: Container[] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<undefined | void> = new vscode.EventEmitter< undefined | void>();
	readonly onDidChangeTreeData: vscode.Event< undefined | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) { 
        this.context = context;
    }

    getTreeItem(element: Container): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Container): Thenable<Container[]> {
        if (!element) {
            return this.getExistedContainers();
        }
        return Promise.resolve([]);
    }

    private getExistedContainers(): Thenable<Container[]> {
        return new Promise((resolve, reject) => {
            const configuration = new Configuration();
            const listAllContainersCommand = `${configuration.getContainerEngine()} ps --format '{"containerId": "{{.ID}}", "label": "{{.Names}}"}' --all`;
            exec(listAllContainersCommand, (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                    reject(error);
                } else if (stderr) {
                    vscode.window.showErrorMessage(`Error: ${stderr}`);
                    reject(new Error(stderr));
                } else {
                    let allContainerCommandOutput = "[" + stdout.split('\n').join(', ') + "]";
                    allContainerCommandOutput = allContainerCommandOutput.replace("}, ]", "}]");
                    const allContainers = JSON.parse(allContainerCommandOutput);

                    const listRunningContainersCommand = `${configuration.getContainerEngine()} ps --format '{"containerId": "{{.ID}}", "label": "{{.Names}}"}'`;
                    exec(listRunningContainersCommand, (error, stdout, stderr) => {
                        const containerObjects: Container[] = [];
                        if (error) {
                            vscode.window.showErrorMessage(`Error: ${error.message}`);
                            reject(error);
                        } else if (stderr) {
                            vscode.window.showErrorMessage(`Error: ${stderr}`);
                            reject(new Error(stderr));
                        } else {
                            let runningContainersCommandOutput = "[" + stdout.split('\n').join(', ') + "]";
                            runningContainersCommandOutput = runningContainersCommandOutput.replace("}, ]", "}]");
                            const runningContainers = JSON.parse(runningContainersCommandOutput);

                            // Filter out running containers from all containers
                            this.exitedContainers = allContainers.filter((allContainer: any) => {
                                return !runningContainers.some((runningContainer: any) => {
                                    return runningContainer.containerId === allContainer.containerId;
                                });
                            });

                            for (const exitedContainer of this.exitedContainers) {
                                if (!exitedContainer.containerId) { continue; }
                                const container = new Container(this.context, exitedContainer.label, exitedContainer.containerId, vscode.TreeItemCollapsibleState.None);
                                containerObjects.push(container);
                            }
                            this.exitedContainers = containerObjects;
                            resolve(this.exitedContainers);
                        }
                    });
                }
            });
        });
    }

    refresh(): void {
        this.getExistedContainers().then((exitedContainers) => {
            this._onDidChangeTreeData?.fire();
        });
    }
}
