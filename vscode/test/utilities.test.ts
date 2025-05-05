import type { TextEditor } from 'vscode';

import { expect } from 'chai';
import assert from 'node:assert';
import { commands, Position, Selection, Uri, window } from 'vscode';

import { getSelectedRange, hasRemote, normalizeUrl, toSelection } from '../src/utilities';

describe('utilities', () => {
    describe('hasRemote', () => {
        it('returns true when repository has a remote.', () => {
            expect(
                hasRemote({
                    remote: { name: 'origin', urls: ['a'] },
                    root: Uri.file(process.cwd())
                })
            ).to.be.true;
        });

        it('returns false when repository does not have a remote.', () => {
            expect(hasRemote({ remote: undefined, root: Uri.file(process.cwd()) })).to.be.false;
        });
    });

    describe('normalizeUrl', () => {
        it('should remove the username from HTTP URLs.', () => {
            expect(normalizeUrl('http://me@example.com')).to.equal('http://example.com');
        });

        it('should remove the username from HTTPS URLs.', () => {
            expect(normalizeUrl('https://me@example.com')).to.equal('https://example.com');
        });

        it('should not change the HTTP URL if it does not contain a username.', () => {
            expect(normalizeUrl('http://example.com')).to.equal('http://example.com');
        });

        it('should remove the SSH prefix.', () => {
            expect(normalizeUrl('ssh://example.com')).to.equal('example.com');
        });

        it('should remove the "git@" prefix.', () => {
            expect(normalizeUrl('git@example.com')).to.equal('example.com');
        });

        it('should remove the SSH prefix and the "git@" prefix.', () => {
            expect(normalizeUrl('ssh://git@example.com')).to.equal('example.com');
        });

        it('should not change the SSH URL if it does not contain the SSH prefix.', () => {
            expect(normalizeUrl('example.com')).to.equal('example.com');
        });

        it('should remove the trailing slash from HTTP URLs.', () => {
            expect(normalizeUrl('http://example.com/')).to.equal('http://example.com');
        });

        it('should remove the trailing slash from SSH URLs.', () => {
            expect(normalizeUrl('ssh://example.com/')).to.equal('example.com');
        });
    });

    describe('getSelectedRange', () => {
        let editor: TextEditor;

        before(async () => {
            await commands.executeCommand('openEditors.newUntitledFile');

            assert(window.activeTextEditor !== undefined);
            editor = window.activeTextEditor;

            await editor.edit((b) => {
                b.insert(
                    new Position(0, 0),
                    ['first line', 'second', 'third', 'fourth line', 'fifth'].join('\n')
                );
            });
        });

        after(async () => {
            await commands.executeCommand('workbench.action.closeActiveEditor');
        });

        it('should convert to one-based values.', () => {
            editor.selection = new Selection(new Position(1, 2), new Position(3, 4));

            expect(getSelectedRange(editor)).to.deep.equal({
                startLine: 2,
                startColumn: 3,
                endLine: 4,
                endColumn: 5
            });
        });

        it('should return correct value when selection is single point at the start of the line.', () => {
            editor.selection = new Selection(new Position(1, 0), new Position(1, 0));

            expect(getSelectedRange(editor)).to.deep.equal({
                startLine: 2,
                startColumn: 1,
                endLine: 2,
                endColumn: 1
            });
        });

        it('should return correct value when selection is a single line.', () => {
            editor.selection = new Selection(new Position(3, 2), new Position(3, 5));

            expect(getSelectedRange(editor)).to.deep.equal({
                startLine: 4,
                startColumn: 3,
                endLine: 4,
                endColumn: 6
            });
        });

        it('should exclude the last line if selection ends at the start of a new line.', () => {
            editor.selection = new Selection(new Position(2, 0), new Position(3, 0));

            expect(getSelectedRange(editor)).to.deep.equal({
                startLine: 3,
                startColumn: 1,
                endLine: 3,
                endColumn: 6
            });
        });
    });

    describe('toSelection', () => {
        it('should convert to zero-based values.', () => {
            expect(
                toSelection({ startLine: 10, startColumn: 20, endLine: 30, endColumn: 40 })
            ).to.deep.equal(new Selection(new Position(9, 19), new Position(29, 39)));
        });
    });
});
