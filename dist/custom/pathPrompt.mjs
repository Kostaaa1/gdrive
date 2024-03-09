import { createPrompt, useState, useKeypress, usePrefix, isEnterKey, makeTheme, usePagination, } from "@inquirer/core";
import fs from "fs/promises";
import path from "path";
import ansiEscapes from "ansi-escapes";
import { statSync, writeFileSync } from "fs";
const isDirectory = (item) => {
    try {
        const v = !item.startsWith(path.sep) ? `${path.sep}${item}` : item;
        const stats = statSync(v);
        return stats.isDirectory();
    }
    catch (error) {
        return false;
    }
};
export const getPathItems = async (p) => {
    try {
        const exists = await fs
            .access(p)
            .then(() => true)
            .catch(() => false);
        if (exists && p.endsWith(path.sep)) {
            const items = await fs.readdir(p);
            return items;
        }
        else {
            if (p.endsWith(path.sep))
                return [];
            const base = path.dirname(p);
            const ext = path.basename(p);
            const filesInBase = await fs.readdir(base);
            return filesInBase.filter((x) => x.startsWith(ext));
        }
    }
    catch (error) {
        return [];
    }
};
export default createPrompt((config, done) => {
    const { validate = () => true } = config;
    const theme = makeTheme(config.theme);
    const [status, setStatus] = useState("pending");
    const [defaultValue = "", setDefaultValue] = useState(config.default);
    const [errorMsg, setError] = useState(undefined);
    const [value, setValue] = useState("");
    const isLoading = status === "loading";
    const prefix = usePrefix({ isLoading, theme });
    const [paths, setPaths] = useState([]);
    const [active, setActive] = useState(0);
    useKeypress(async (key, rl) => {
        if (status !== "pending")
            return;
        if (isEnterKey(key)) {
            if (paths.length === 0) {
                const answer = value || defaultValue;
                setStatus("loading");
                const isValid = await validate(answer);
                if (isValid === true) {
                    setValue(answer);
                    setStatus("done");
                    done(answer);
                }
            }
            else {
                setPaths([]);
                setValue(value);
                rl.write(value);
            }
        }
        else if (key.name === "tab") {
            rl.clearLine(0);
            if (!value) {
                rl.write(defaultValue);
                setValue(defaultValue);
            }
            else {
                const p = paths.length === 0 ? await getPathItems(value) : paths;
                if (p.length === 0) {
                    writeFileSync("/mnt/c/Users/kosta/OneDrive/Desktop/imgs/transformed/bug.txt", JSON.stringify({ line: rl.line, paths, value, empty: "EMPTY AS FUCKKKKKKKK" }, null, 2));
                    setPaths([]);
                    setValue(rl.line);
                    // rl.write(value);
                    return;
                }
                const base = paths.length === 0 && value.endsWith(path.sep) ? value : path.dirname(value);
                setPaths(p);
                const newPaths = p.map((x) => x + path.sep);
                let next;
                // @ts-ignore // key.shift
                if (paths.length > 0 && key.shift) {
                    next = active > 0 ? active - 1 : paths.length - 1;
                }
                else {
                    next = paths.length !== 0 && paths.length > active + 1 ? active + 1 : 0;
                }
                setActive(next);
                const newPath = path.join(base, newPaths[next]);
                setValue(newPath);
                rl.write(newPath);
            }
        }
        else {
            setDefaultValue(undefined);
            setActive(0);
            setPaths([]);
            setValue(rl.line);
            setError(undefined);
        }
    });
    let paginatedPaths = "";
    if (paths.length > 0)
        paginatedPaths = usePagination({
            items: paths,
            active,
            renderItem: (data) => {
                const { isActive, item } = data;
                const color = isActive ? theme.style.highlight : (x) => x;
                return color(item);
            },
            pageSize: 5,
            loop: true,
            theme,
        });
    const message = theme.style.message(config.message);
    let formattedValue = value;
    if (typeof config.transformer === "function") {
        formattedValue = config.transformer(value, { isFinal: status === "done" });
    }
    else if (status === "done") {
        formattedValue = theme.style.answer(value);
    }
    let defaultStr;
    if (defaultValue && status !== "done" && !value) {
        defaultStr = theme.style.defaultAnswer(defaultValue);
    }
    let error = "";
    if (errorMsg) {
        error = theme.style.error(errorMsg);
    }
    return [
        [prefix, message, defaultStr, formattedValue].filter(Boolean).join(" ") +
            `${ansiEscapes.cursorHide}\n${paginatedPaths}`,
        error,
    ];
});
//# sourceMappingURL=pathPrompt.mjs.map