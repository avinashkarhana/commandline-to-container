import * as vscode from 'vscode';
import { exec } from 'child_process';
import { Container } from './containers';
import { Configuration } from './configuration';

export class RunningContainersProvider implements vscode.TreeDataProvider<Container> {

    private runningContainers: Container[] = [];

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
            return this.getRunningContainers();
        }
        return Promise.resolve([]);
    }

    private getRunningContainers(): Thenable<Container[]> {
        return new Promise((resolve, reject) => {
            const configuration = new Configuration();
            const command = `${configuration.getContainerEngine()} ps --format '{"containerId": "{{.ID}}", "label": "{{.Names}}"}'`;
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
                    this.runningContainers = containerObjects;
                    resolve(this.runningContainers);
                }
            });
        });
    }

    refresh(): void {
        this.getRunningContainers().then((containers) => {
            this._onDidChangeTreeData?.fire();
        });
    }
}
