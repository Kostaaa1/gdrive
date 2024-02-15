import { createPrompt, useState, useKeypress, usePrefix, usePagination, useRef, useMemo, isEnterKey, isUpKey, isDownKey, isNumberKey, Separator, makeTheme, } from "@inquirer/core";
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
    const renderAction = (choice) => ` ${choice.name} [${choice.key}]`;
    const answer = await createPrompt((config, done) => {
        const { isSeparator } = Separator;
        const { choices, loop = true, pageSize = 10 } = config;
        const firstRender = useRef(true);
        const theme = makeTheme(selectTheme, config.theme);
        const prefix = usePrefix({ theme });
        const [status, setStatus] = useState("pending");
        // @ts-ignore
        const items = choices.filter((x) => !x.key);
        const keyItems = choices.filter((x) => !items.includes(x));
        const bounds = useMemo(() => {
            const first = items.findIndex(isSelectable);
            // TODO: Replace with `findLastIndex` when it's available.
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
        useKeypress((key, _rl) => {
            if (isEnterKey(key)) {
                setStatus("done");
                done(selectedChoice.value);
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
            else if (isNumberKey(key)) {
                const position = Number(key.name) - 1;
                const item = items[position];
                if (item != null && isSelectable(item)) {
                    setActive(position);
                }
            }
            else {
                const keyChoice = keyItems.find((x) => !isSeparator(x) && x.key === key.name);
                if (keyChoice) {
                    setStatus("done");
                    //@ts-ignore
                    done(keyChoice.value);
                }
            }
        });
        const message = theme.style.message(config.message);
        let helpTip;
        if (firstRender.current && items.length <= pageSize) {
            firstRender.current = false;
            helpTip = theme.style.help("(Use arrow keys)");
        }
        const page = usePagination({
            items,
            active,
            renderItem({ item, isActive }) {
                if (isSeparator(item)) {
                    return ` ${item.separator}`;
                }
                const line = item.name || item.value;
                if (item.disabled) {
                    const disabledLabel = typeof item.disabled === "string" ? item.disabled : "(disabled)";
                    return theme.style.disabled(`${line} ${disabledLabel}`);
                }
                const color = isActive ? theme.style.highlight : (x) => x;
                const cursor = isActive ? theme.icon.cursor : ` `;
                return color(`${cursor} ${line}`);
            },
            pageSize,
            loop,
            theme,
        });
        if (status === "done") {
            const answer = selectedChoice.name || String(selectedChoice.value);
            return `${prefix} ${message} ${theme.style.answer(answer)}`;
        }
        const keyActions = keyItems.map((x) => !isSeparator(x) && renderAction(x)).join("\n");
        const choiceDescription = selectedChoice.description
            ? `\n${selectedChoice.description}`
            : ``;
        return `${[prefix, message, helpTip]
            .filter(Boolean)
            .join(" ")}\n${page}${choiceDescription}${ansiEscapes.cursorHide}\n${keyActions}`;
    })(options);
    return answer;
};
//# sourceMappingURL=interactivePrompt.js.map