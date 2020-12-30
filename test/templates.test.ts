import { expect } from 'chai';

import { ParsedTemplate, parseTemplate } from '../src/templates';

describe('templates', () => {
    describe('parseTemplate', () => {
        let template: ParsedTemplate;

        it('should parse single string.', () => {
            template = parseTemplate('Hello {{ name }}!');

            expect(template.render({ name: 'world' })).to.equal('Hello world!');
        });

        it('should concatenate multiple strings.', () => {
            template = parseTemplate([
                'This is line #{{ first }}',
                'and this is line #{{ second }}.'
            ]);

            expect(template.render({ first: 1, second: 2 })).to.equal(
                'This is line #1and this is line #2.'
            );
        });

        it('should support encodeUri().', () => {
            template = parseTemplate('This{{ " + " | uri }}that');

            expect(template.render({})).to.equal('This%20+%20that');
        });

        it('should support encodeUriComponent().', () => {
            template = parseTemplate('This{{ " + " | uri_component }}that');

            expect(template.render({})).to.equal('This%20%2B%20that');
        });

        it('should support path.basename().', () => {
            template = parseTemplate('The name is {{ "foo/bar/meep.ts" | filename }}.');

            expect(template.render({})).to.equal('The name is meep.ts.');
        });
    });
});
