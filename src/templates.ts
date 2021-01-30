import { Liquid, Template as LiquidTemplate } from 'liquidjs';
import { posix } from 'path';

import { Template } from './schema';

const engine: Liquid = new Liquid({
    strictFilters: true
});

engine.filters.set('filename', posix.basename);
engine.filters.set('encode_uri', encodeURI);
engine.filters.set('encode_uri_component', encodeURIComponent);
engine.filters.set('decode_uri', decodeURI);
engine.filters.set('decode_uri_component', decodeURIComponent);

/**
 * Parses the given template.
 *
 * @param template The template to parse.
 * @returns The parsed template.
 */
export function parseTemplate(template: Template): ParsedTemplate {
    let parsed: LiquidTemplate[];

    // A template can be defined as an array of strings.
    // This is just a convenience to allow the template to
    // be split over multiple lines in the JSON definition file.
    // Join all of the parts together to create the complete template.
    if (Array.isArray(template)) {
        template = template.join('');
    }

    parsed = engine.parse(template);

    return {
        render: (props) => engine.renderSync(parsed, props) as string // eslint-disable-line node/no-sync
    };
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
    render(props: object): string; // eslint-disable-line @typescript-eslint/ban-types
}
