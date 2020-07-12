import { OutputChannel, window } from 'vscode';

let channel: OutputChannel | undefined;

export class Logger {
    public static writeLine(message: string, data?: unknown): void {
        if (!channel) {
            channel = window.createOutputChannel('GitWebLinks');
        }

        if (data) {
            if (typeof data === 'object') {
                data = JSON.stringify(data, undefined, 4);
            } else {
                data = `${data}`;
            }

            message = message + '\n' + data;
        }

        channel.appendLine(`[${formatTime()}] ${message}`);
    }
}

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

function pad(value: number, length: number): string {
    return `${value}`.padStart(length, '0');
}
