import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  isEnterKey,
  makeTheme,
  type Theme,
  usePagination,
  isBackspaceKey,
} from "@inquirer/core";
import type { PartialDeep } from "@inquirer/type";
import fs from "fs/promises";
import path from "path";
import ansiEscapes from "ansi-escapes";

type InputConfig = {
  message: string;
  default: string;
  transformer?: (value: string, { isFinal }: { isFinal: boolean }) => string;
  validate?: (value: string) => boolean | string | Promise<string | boolean>;
  theme?: PartialDeep<Theme>;
};

export const getPathItems = async (p: string): Promise<string[]> => {
  try {
    await fs.writeFile(
      "/mnt/c/Users/kosta/OneDrive/Desktop/imgs/transformed/skrtt.txt",
      JSON.stringify({ p }, null, 2)
    );
    const exists = await fs
      .access(p)
      .then(() => true)
      .catch(() => false);

    if (exists && p.endsWith(path.sep)) {
      const items = await fs.readdir(p);
      return items;
    } else {
      if (p.endsWith(path.sep)) return [];

      const base = path.dirname(p);
      const ext = path.basename(p);
      const filesInBase = await fs.readdir(base);
      return filesInBase.filter((x) => x.startsWith(ext));
    }
  } catch (error) {
    return [];
  }
};

export default createPrompt<string, InputConfig>((config, done) => {
  const { validate = () => true } = config;
  const theme = makeTheme(config.theme);
  const [status, setStatus] = useState<string>("pending");
  const [defaultValue = "", setDefaultValue] = useState<string | undefined>(config.default);
  const [errorMsg, setError] = useState<string | undefined>(undefined);
  const [value, setValue] = useState<string>("");

  const isLoading = status === "loading";
  const prefix = usePrefix({ isLoading, theme });

  const [paths, setPaths] = useState<string[]>([]);
  const [active, setActive] = useState<number>(0);

  useKeypress(async (key, rl) => {
    if (status !== "pending") return;
    if (isEnterKey(key)) {
      if (paths.length === 0) {
        const answer = value || defaultValue;
        setStatus("loading");
        const isValid = await validate(answer);

        if (isValid === true) {
          setValue(answer);
          setStatus("done");
          done(answer);
        } else {
          // rl.write(value);
          // setValue(value);
          // setError(isValid || "You must provide a valid value");
          // setStatus("pending");
        }
      } else {
        setPaths([]);
        rl.write(value);
        setValue(value);
      }
    } else if (key.name === "tab") {
      rl.clearLine(0);

      if (!value) {
        rl.write(defaultValue);
        setValue(defaultValue);
      } else {
        const p = paths.length === 0 ? await getPathItems(value) : paths;
        if (p.length === 0) {
          rl.write(value);
          return;
        }

        const base = paths.length === 0 && value.endsWith(path.sep) ? value : path.dirname(value);
        setPaths(p);

        const newPaths = p.map((x) => x + path.sep);
        let next: number;

        // @ts-ignore
        if (paths.length > 0 && key.shift) {
          next = active > 0 ? active - 1 : paths.length - 1;
        } else {
          next = paths.length !== 0 && paths.length > active + 1 ? active + 1 : 0;
        }

        setActive(next);
        const newPath = path.join(base, newPaths[next]);

        rl.write(newPath);
        setValue(newPath);
      }
    } else {
      setDefaultValue(undefined);
      setActive(0);
      setPaths([]);
      setValue(rl.line);
      setError(undefined);
    }
  });

  let paginatedPaths: string = "";
  if (paths.length > 0)
    paginatedPaths = usePagination({
      items: paths,
      active,
      renderItem: (data) => {
        const { index, isActive, item } = data;
        const color = isActive ? theme.style.highlight : (x: string) => x;
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
  } else if (status === "done") {
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
