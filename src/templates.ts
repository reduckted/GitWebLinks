import { Liquid, Template as LiquidTemplate } from 'liquidjs';
import { posix } from 'path';
import { Template } from './schema';

const engine: Liquid = new Liquid();

engine.filters.set('filename', posix.basename);
engine.filters.set('uri', encodeURI);
engine.filters.set('uri_component', encodeURIComponent);

/**
 * Parses the given template.
 * @param template The template to parse.
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
        render: (props) => engine.renderSync(parsed, props)
    };
}

/**
 * Represents a template that has been pared and can be rendered.
 */
export interface ParsedTemplate {
    /**
     * Renders the template.
     * @param props The properties to make available to the template.
     * @returns The rendered output.
     */
    render(props: object): string;
}
