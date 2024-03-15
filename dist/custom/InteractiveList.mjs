import stringWidth from "string-width";
import { createPrompt, useState, useKeypress, usePrefix, usePagination, useRef, useMemo, isEnterKey, isUpKey, isDownKey, isNumberKey, makeTheme, } from "@inquirer/core";
import { Separator } from "./Separator.mjs";
import chalk from "chalk";
import figures from "figures";
import ansiEscapes from "ansi-escapes";
const selectTheme = {
    icon: { cursor: figures.pointer },
    style: { disabled: (text) => chalk.dim(`- ${text}`) },
};
function isSelectable(item) {
    return !Separator.isSeparator(item) && !item.disabled;
}
export default async (options) => {
    const answer = await createPrompt((config, done) => {
        const { choices: items, loop = true, pageSize = 10, actions, prefix: initPrefix, actionMsg, sufix = chalk.gray("Press <ESC> to return"), } = config;
        const styledActionMessage = actionMsg ? chalk.underline.italic(actionMsg) : "";
        const firstRender = useRef(true);
        const theme = makeTheme(selectTheme, config.theme);
        const prefix = (initPrefix || "") + usePrefix({ theme }) + " ";
        const [status, setStatus] = useState("pending");
        const { isSeparator } = Separator;
        const bounds = useMemo(() => {
            const first = items.findIndex(isSelectable);
            const last = items.length - 1 - [...items].reverse().findIndex(isSelectable);
            if (first < 0)
                throw new Error("[select prompt] No selectable choices. All choices are disabled.");
            return { first, last };
        }, [items]);
        const defaultItemIndex = useMemo(() => {
            if (!("default" in config))
                return -1;
            return items.findIndex((item) => isSelectable(item) && item.value === config.default);
        }, [config.default, items]);
        const [active, setActive] = useState(defaultItemIndex === -1 ? bounds.first : defaultItemIndex);
        const selectedChoice = items[active];
        useKeypress(async (key, _rl) => {
            if (isEnterKey(key)) {
                // setStatus("done");
                done(selectedChoice.value);
            }
            else if (isUpKey(key) ||
                isDownKey(key) ||
                key.name === "tab" ||
                // @ts-ignore
                (key.name === "tab" && key.shift)) {
                // @ts-ignore
                const shouldGoUp = isUpKey(key) || (key.name === "tab" && key.shift);
                const shouldGoDown = isDownKey(key) || key.name === "tab";
                if (loop ||
                    (shouldGoUp && active !== bounds.first) ||
                    (shouldGoDown && active !== bounds.last)) {
                    const offset = shouldGoUp ? -1 : 1;
                    let next = active;
                    do {
                        next = (next + offset + items.length) % items.length;
                    } while (!isSelectable(items[next]));
                    setActive(next);
                }
            }
            else if (isNumberKey(key)) {
                const position = Number(key.name) - 1;
                const item = items[position];
                if (item != null && isSelectable(item)) {
                    setActive(position);
                }
            }
            else if (key.name === "escape") {
                done(null);
                // setStatus("done");
            }
            else {
                const keyChoice = actions?.find((x) => !isSeparator(x) && x.key === key.name);
                if (keyChoice && !isSeparator(keyChoice)) {
                    keyChoice;
                    // setStatus("done");
                    done(keyChoice.value);
                }
            }
        });
        const message = chalk.italic(theme.style.message(config.message));
        // let helpTip;
        if (firstRender.current && items.length <= pageSize) {
            firstRender.current = false;
            // helpTip = theme.style.help("(Use arrow keys)");
        }
        let page = usePagination({
            items,
            active,
            renderItem({ item, isActive }) {
                if (isSeparator(item)) {
                    return `${item.separator}`;
                }
                const line = item.name || item.value;
                if (item.disabled) {
                    const disabledLabel = typeof item.disabled === "string" ? item.disabled : "(disabled)";
                    return theme.style.disabled(`${line} ${disabledLabel}`);
                }
                const color = isActive ? theme.style.highlight : (x) => x;
                const cursor = isActive ? theme.icon.cursor : ` `;
                return color(chalk.italic(`${cursor} ${line}`));
            },
            pageSize,
            loop,
            theme,
        });
        if (status === "done") {
            const answer = selectedChoice.name || String(selectedChoice.value);
            return `${prefix} ${message} ${theme.style.answer(answer)}`;
        }
        // page = page.split("(Use arrow keys to reveal more choices)")[0];
        const keyActions = actions && actions?.length > 0
            ? actions
                ?.map((action, id) => !isSeparator(action)
                ? `${action.name} ${chalk.blueBright("[" + action.key + "]")}`
                : action.separator)
                .join("\n")
            : "";
        const keyActionOutput = [styledActionMessage, keyActions].filter(Boolean).join("\n\n");
        const choiceDescription = selectedChoice.description
            ? `\n${selectedChoice.description}`
            : ``;
        const separator = new Separator(process.stdout.columns).separator;
        const lheader = [prefix, message].filter(Boolean).join("");
        const header = lheader +
            " ".repeat(process.stdout.columns - 1 - stringWidth(lheader) - stringWidth(sufix)) +
            chalk.gray(sufix);
        return `${header}\n${separator}\n${page}${choiceDescription}\n${separator}\n${keyActionOutput}\n
      ${ansiEscapes.cursorHide}`;
    })(options);
    return answer;
};
//# sourceMappingURL=InteractiveList.mjs.map