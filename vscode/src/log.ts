import type { OutputChannel } from 'vscode';

import { format } from 'util';
import { window } from 'vscode';

let channel: OutputChannel | undefined;

/**
 * Logs a message.
 *
 * @param message The message to log.
 * @param args Additional data to include with the message.
 */
export function log(message: string, ...args: unknown[]): void {
    if (!channel) {
        channel = window.createOutputChannel('GitWebLinks');
    }

    message = format(message, ...args);

    channel.appendLine(`[${formatTime()}] ${message}`);
}

/**
 * Formats the current time.
 *
 * @returns The current time as a string.
 */
function formatTime(): string {
    let time: Date;
    let hh: string;
    let mm: string;
    let ss: string;
    let zzz: string;

    time = new Date();
    hh = pad(time.getHours(), 2);
    mm = pad(time.getMinutes(), 2);
    ss = pad(time.getSeconds(), 2);
    zzz = pad(time.getMilliseconds(), 3);

    return `${hh}:${mm}:${ss}.${zzz}`;
}

/**
 * Pads the given number with zeros.
 *
 * @param value The value to pad.
 * @param length The length to pad to.
 * @returns The padded value.
 */
function pad(value: number, length: number): string {
    return `${value}`.padStart(length, '0');
}
