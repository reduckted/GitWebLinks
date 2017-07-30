import * as clipboard from 'copy-paste';


export class Clipboard {

    public static setText(text: string) {
        clipboard.copy(text);
    }

}
