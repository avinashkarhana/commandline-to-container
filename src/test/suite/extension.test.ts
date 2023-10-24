import * as assert from 'assert';
import * as vscode from 'vscode';
import { Container } from '../../containers';
import { startTerminal } from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	let testUri = vscode.Uri.parse('vscode:///test');
	let testContext = { extensionUri: testUri } as unknown as vscode.ExtensionContext;

	test('startTerminal function rejects: With malformed node', () => {
		let testNode = new Container(testContext, 'TestLabel', '');
		// assert that startTerminal(testNode) rejects with `Container ID not found`
		let result = startTerminal(testNode);
		return assert.rejects(result);
	});

	test('startTerminal function resolves: With valid node', () => {
		let testNode = new Container(testContext, 'TestLabel', 'node');
		// assert that startTerminal(testNode) resolves with true
		return startTerminal(testNode).then((result) => {
			return assert.strictEqual(result, 'node');
		});
	});
});
