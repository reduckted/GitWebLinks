import * as clipboard from 'copy-paste';


export class Clipboard {

    public static async setText(text: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Note: Requires xclip on Linux.
            clipboard.copy(text, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

}
