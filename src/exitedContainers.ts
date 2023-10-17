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
            const command = `${configuration.getContainerEngine()} ps --format '{"containerId": "{{.ID}}", "label": "{{.Names}}"}' --filter 'status=exited'`;
            exec(command, (error, stdout, stderr) => {
                const containerObjects: Container[] = [];
                if (error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                    reject(error);
                } else if (stderr) {
                    vscode.window.showErrorMessage(`Error: ${stderr}`);
                    reject(new Error(stderr));
                } else {
                    const lines = stdout.split('\n');
                    for (const line of lines) {
                        if (line.trim() === '') { continue; }
                        try {
                            const containerData = JSON.parse(line);
                            const container = new Container(this.context, containerData.label, containerData.containerId, vscode.TreeItemCollapsibleState.None);
                            containerObjects.push(container);
                        } catch (e) {
                            vscode.window.showErrorMessage(`Error parsing line as JSON: ${line}`);
                        }
                    }
                    this.exitedContainers = containerObjects;
                    resolve(this.exitedContainers);
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
