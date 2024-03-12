import chalk from "chalk";
import figures from "figures";
/**
 * Separator object
 * Used to space/separate choices group
 */
export class Separator {
    constructor(length, separator) {
        this.type = "separator";
        this.separator = chalk.dim(new Array(length).join(figures.line));
        if (separator) {
            this.separator = separator;
        }
    }
    static isSeparator(choice) {
        return Boolean(choice && choice.type === "separator");
    }
}
//# sourceMappingURL=Separator.mjs.map