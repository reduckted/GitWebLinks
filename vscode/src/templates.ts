import { Liquid, Template as LiquidTemplate } from 'liquidjs';
import { posix } from 'path';

import { Template } from './schema';

const engine: Liquid = new Liquid({
    strictFilters: true
});

engine.filters['filename'] = posix.basename.bind(posix);
engine.filters['encode_uri'] = encodeURI;
engine.filters['encode_uri_component'] = encodeURIComponent;
engine.filters['encode_uri_component_segments'] = encodeURIComponentSegments;
engine.filters['decode_uri'] = decodeURI;
engine.filters['decode_uri_component'] = decodeURIComponent;
engine.filters['decode_uri_component_segments'] = decodeURIComponentSegments;

/**
 * Parses the given template.
 *
 * @param template The template to parse.
 * @returns The parsed template.
 */
export function parseTemplate(template: Template): ParsedTemplate;

/**
 * Parses the given template.
 *
 * @param template The template to parse.
 * @returns The parsed template.
 */
export function parseTemplate(template: Template | undefined): ParsedTemplate | undefined;

/**
 * Parses the given template.
 *
 * @param template The template to parse.
 * @returns The parsed template.
 */
export function parseTemplate(template: Template | undefined): ParsedTemplate | undefined {
    let parsed: LiquidTemplate[];

    if (template === undefined) {
        return undefined;
    }

    // A template can be defined as an array of strings.
    // This is just a convenience to allow the template to
    // be split over multiple lines in the JSON definition file.
    // Join all of the parts together to create the complete template.
    if (Array.isArray(template)) {
        template = template.join('');
    }

    parsed = engine.parse(template);

    return {
        render: (props) => engine.renderSync(parsed, props) as string // eslint-disable-line n/no-sync
    };
}

/**
 * A template filter that splits the value into path segments (at the '/' character)
 * and applies `encodeURIComponent` on each segment before joining the segments back together.
 *
 * @param value The value to transform.
 * @returns The transformed value.
 */
function encodeURIComponentSegments(value: string): string {
    // Split the value into path segments so that
    // `encodeURIComponent` doesn't encode the '/' character.
    return value.split('/').map(encodeURIComponent).join('/');
}

/**
 * A template filter that reverses `encodeURIComponentSegments`.
 *
 * @param value The value to transform.
 * @returns The transformed value.
 */
function decodeURIComponentSegments(value: string): string {
    return value.split('/').map(decodeURIComponent).join('/');
}

/**
 * Represents a template that has been pared and can be rendered.
 */
export interface ParsedTemplate {
    /**
     * Renders the template.
     *
     * @param props The properties to make available to the template.
     * @returns The rendered output.
     */
    render(props: object): string;
}
