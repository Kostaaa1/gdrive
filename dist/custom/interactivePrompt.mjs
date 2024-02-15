import { createPrompt, useState, useKeypress, usePrefix, isEnterKey, isUpKey, isDownKey, } from "@inquirer/core";
import chalk from "chalk";
import readline from "readline";
// @ts-ignore
export default async (options) => {
    console.log("OPTIONSSSSSS: ", options);
    const { 
    // @ts-ignore
    renderSelected = (choice) => chalk.green(`❯ ${choice.name} (${choice.key})`), 
    // @ts-ignore
    renderUnselected = (choice) => `  ${choice.name} (${choice.key})`, hideCursor = true, } = options;
    let rl;
    if (hideCursor) {
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.write("\x1B[?25l"); // Hide cursor
    }
    const answer = await createPrompt((config, done) => {
        // @ts-ignore
        const { choices, default: defaultKey } = config;
        const [status, setStatus] = useState("pending");
        const [index, setIndex] = useState(
        // @ts-ignore
        choices.findIndex((choice) => choice.value === defaultKey ?? ""));
        const prefix = usePrefix({});
        useKeypress((key, _rl) => {
            if (isEnterKey(key)) {
                const selectedChoice = choices[index];
                if (selectedChoice) {
                    setStatus("done");
                    done(selectedChoice.value);
                }
            }
            else if (isUpKey(key)) {
                setIndex(index > 0 ? index - 1 : 0);
            }
            else if (isDownKey(key)) {
                setIndex(index < choices.length - 1 ? index + 1 : choices.length - 1);
            }
            else {
                // @ts-ignore
                const foundIndex = choices.findIndex((choice) => {
                    const choiceValue = choice.value.toLowerCase();
                    const keyName = key.name.toLowerCase();
                    return choiceValue.startsWith(keyName);
                });
                if (foundIndex !== -1) {
                    setIndex(foundIndex);
                    // This automatically finishes the prompt. Remove this if you don't want that.
                    setStatus("done");
                    done(choices[foundIndex].value);
                }
            }
        });
        // @ts-ignore
        const message = chalk.bold(config.message);
        if (status === "done") {
            return `${prefix} ${message} ${chalk.cyan(choices[index].name)}`;
        }
        const renderedChoices = choices
            // @ts-ignore
            .map((choice, i) => {
            if (i === index) {
                return renderSelected(choice, index);
            }
            return renderUnselected(choice, i);
        })
            .join("\n");
        return [`${prefix} ${message}`, renderedChoices];
    })(options);
    if (hideCursor) {
        // @ts-ignore
        rl.write("\x1B[?25h"); // Show cursor
        // @ts-ignore
        rl.close();
    }
    return answer;
};
//# sourceMappingURL=interactivePrompt.mjs.map