import { expect } from 'chai';

import { ParsedTemplate, parseTemplate } from '../src/templates';

describe('templates', () => {
    describe('parseTemplate', () => {
        let template: ParsedTemplate;

        it('should return undefined for undefined template.', () => {
            expect(parseTemplate(undefined)).to.be.undefined;
        });

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
            template = parseTemplate('This{{ " + " | encode_uri }}that');

            expect(template.render({})).to.equal('This%20+%20that');
        });

        it('should support encodeUriComponent().', () => {
            template = parseTemplate('This{{ " + " | encode_uri_component }}that');

            expect(template.render({})).to.equal('This%20%2B%20that');
        });

        it('should support encodeUriComponent() on path segments.', () => {
            template = parseTemplate('This{{ "/a/b#c/d/" | encode_uri_component_segments }}that');

            expect(template.render({})).to.equal('This/a/b%23c/d/that');
        });

        it('should support decodeUri().', () => {
            template = parseTemplate('This{{ "%20+%20" | decode_uri }}that');

            expect(template.render({})).to.equal('This + that');
        });

        it('should support decodeUriComponent().', () => {
            template = parseTemplate('This{{ "%20%2B%20" | decode_uri_component }}that');

            expect(template.render({})).to.equal('This + that');
        });

        it('should support decodeUriComponent() on path segments.', () => {
            template = parseTemplate('This{{ "/a/b%23c/d/" | decode_uri_component_segments }}that');

            expect(template.render({})).to.equal('This/a/b#c/d/that');
        });

        it('should support path.basename().', () => {
            template = parseTemplate('The name is {{ "foo/bar/meep.ts" | filename }}.');

            expect(template.render({})).to.equal('The name is meep.ts.');
        });
    });
});
