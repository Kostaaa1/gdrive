import { createPrompt, useState, useKeypress, usePrefix, usePagination, useMemo, makeTheme, isUpKey, isDownKey, isSpaceKey, isNumberKey, isEnterKey, Separator, } from "@inquirer/core";
import chalk from "chalk";
import figures from "figures";
import ansiEscapes from "ansi-escapes";
import { Separator as CustomSeparator } from "./Separator.mjs";
const checkboxTheme = {
    icon: {
        checked: chalk.green(figures.circleFilled),
        unchecked: figures.circle,
        cursor: figures.pointer,
    },
    style: {
        disabledChoice: (text) => chalk.dim(`- ${text}`),
        renderSelectedChoices: (selectedChoices) => selectedChoices.map((choice) => choice.name || choice.value).join(", "),
    },
};
function isSelectable(item) {
    return !Separator.isSeparator(item) && !item.disabled;
}
function isChecked(item) {
    return isSelectable(item) && Boolean(item.checked);
}
function toggle(item) {
    return isSelectable(item) ? { ...item, checked: !item.checked } : item;
}
function check(checked) {
    return function (item) {
        return isSelectable(item) ? { ...item, checked } : item;
    };
}
export default createPrompt((config, done) => {
    const { instructions, pageSize = 7, loop = true, choices, required, validate = () => true, } = config;
    const theme = makeTheme(checkboxTheme, config.theme);
    const prefix = usePrefix({ theme });
    const [status, setStatus] = useState("pending");
    const [items, setItems] = useState(choices.map((choice) => ({ ...choice })));
    const bounds = useMemo(() => {
        const first = items.findIndex(isSelectable);
        // TODO: Replace with `findLastIndex` when it's available.
        const last = items.length - 1 - [...items].reverse().findIndex(isSelectable);
        if (first < 0) {
            throw new Error("[checkbox prompt] No selectable choices. All choices are disabled.");
        }
        return { first, last };
    }, [items]);
    const [active, setActive] = useState(bounds.first);
    const [showHelpTip, setShowHelpTip] = useState(true);
    const [errorMsg, setError] = useState(undefined);
    useKeypress(async (key) => {
        if (isEnterKey(key)) {
            const selection = items.filter(isChecked);
            const isValid = await validate([...selection]);
            if (required && !items.some(isChecked)) {
                setError("At least one choice must be selected");
            }
            else if (isValid === true) {
                setStatus("done");
                done(selection.map((choice) => choice.value));
            }
            else {
                setError(isValid || "You must select a valid value");
            }
        }
        else if (isUpKey(key) || isDownKey(key)) {
            if (loop ||
                (isUpKey(key) && active !== bounds.first) ||
                (isDownKey(key) && active !== bounds.last)) {
                const offset = isUpKey(key) ? -1 : 1;
                let next = active;
                do {
                    next = (next + offset + items.length) % items.length;
                } while (!isSelectable(items[next]));
                setActive(next);
            }
        }
        else if (isSpaceKey(key)) {
            setError(undefined);
            setShowHelpTip(false);
            setItems(items.map((choice, i) => (i === active ? toggle(choice) : choice)));
        }
        else if (key.name === "a") {
            const selectAll = Boolean(items.find((choice) => isSelectable(choice) && !choice.checked));
            setItems(items.map(check(selectAll)));
        }
        else if (key.name === "i") {
            setItems(items.map(toggle));
        }
        else if (isNumberKey(key)) {
            // Adjust index to start at 1
            const position = Number(key.name) - 1;
            const item = items[position];
            if (item != null && isSelectable(item)) {
                setActive(position);
                setItems(items.map((choice, i) => (i === position ? toggle(choice) : choice)));
            }
        }
        else if ((key.name = "escape")) {
            // @ts-ignore
            done(null);
        }
    });
    const message = theme.style.message(config.message);
    const page = usePagination({
        items,
        active,
        renderItem({ item, isActive }) {
            if (Separator.isSeparator(item)) {
                return ` ${item.separator}`;
                // return new CustomSeparator(process.stdout.columns).separator;
            }
            const line = item.name || item.value;
            if (item.disabled) {
                const disabledLabel = typeof item.disabled === "string" ? item.disabled : "(disabled)";
                return theme.style.disabledChoice(`${line} ${disabledLabel}`);
            }
            const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked;
            const color = isActive ? theme.style.highlight : (x) => x;
            const cursor = isActive ? theme.icon.cursor : " ";
            return color(`${cursor}${checkbox} ${line}`);
        },
        pageSize,
        loop,
        theme,
    });
    if (status === "done") {
        const selection = items.filter(isChecked);
        const answer = theme.style.answer(theme.style.renderSelectedChoices(selection, items));
        return `${prefix} ${message} ${answer}`;
    }
    let helpTip = "";
    if (showHelpTip && (instructions === undefined || instructions)) {
        if (typeof instructions === "string") {
            helpTip = instructions;
        }
        else {
            const keys = [
                `${theme.style.key("space")} to select`,
                `${theme.style.key("a")} to toggle all`,
                `${theme.style.key("i")} to invert selection`,
                `and ${theme.style.key("enter")} to proceed`,
            ];
            helpTip = ` (Press ${keys.join(", ")})`;
        }
    }
    let error = "";
    if (errorMsg) {
        error = theme.style.error(errorMsg);
    }
    const sep = new CustomSeparator(process.stdout.columns).separator;
    return `${prefix} ${message}${helpTip}\n${sep}\n${page}\n${error}${ansiEscapes.cursorHide}`;
});
export { Separator };
//# sourceMappingURL=Checkbox.mjs.map