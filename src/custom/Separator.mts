import chalk from "chalk";
import figures from "figures";

/**
 * Separator object
 * Used to space/separate choices group
 */

export class Separator {
  readonly separator: string;
  readonly type = "separator";

  constructor(length: number, separator?: string) {
    this.separator = chalk.dim(new Array(length).join(figures.line));
    if (separator) {
      this.separator = separator;
    }
  }

  static isSeparator(
    choice: undefined | Separator | Record<string, unknown>
  ): choice is Separator {
    return Boolean(choice && choice.type === "separator");
  }
}
