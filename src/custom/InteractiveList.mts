type ViewFunction<Value, KeyValue, Config> = (
  config: Prettify<Config>,
  done: (value: Value | KeyValue | "EVENT_INTERRUPTED") => void
) => string | [string, string | undefined];

export type Prompt<Value, KeyValue, Config> = (
  config: Config,
  context?: Context
) => CancelablePromise<Value | KeyValue>;

declare module "@inquirer/core" {
  export function createPrompt<Value, KeyValue, Config>(
    view: ViewFunction<Value, KeyValue, Config>
  ): Prompt<Value, KeyValue, Config>;
}

import stringWidth from "string-width";
import type { CancelablePromise, Context, PartialDeep, Prettify } from "@inquirer/type";
import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  usePagination,
  useRef,
  useMemo,
  isEnterKey,
  isUpKey,
  isDownKey,
  isNumberKey,
  makeTheme,
  type Theme,
} from "@inquirer/core";
import { Separator } from "./Separator.mjs";
import chalk from "chalk";
import figures from "figures";
import ansiEscapes from "ansi-escapes";

const selectTheme: SelectTheme = {
  icon: { cursor: figures.pointer },
  style: { disabled: (text: string) => chalk.dim(`- ${text}`) },
};

type SelectTheme = {
  icon: { cursor: string };
  style: { disabled: (text: string) => string };
};

type Item<Value> = Separator | Choice<Value>;
type Choice<Value> = {
  value: Value;
  name?: string;
  description?: string;
  disabled?: boolean | string;
  type?: never;
};

type KeyChoice<KeyValue> = {
  value: KeyValue;
  key: string;
  name: string;
};

type SelectConfig<Value, KeyValue> = {
  message: string;
  choices: ReadonlyArray<Choice<Value>>;
  actions?: ReadonlyArray<KeyChoice<KeyValue>>;
  actionMsg?: string;
  pageSize?: number;
  loop?: boolean;
  default?: unknown;
  theme?: PartialDeep<Theme<SelectTheme>>;
  prefix?: string;
  sufix?: string | null;
  includeSeperators?: boolean;
  historyId?: number;
};

function isSelectable<Value>(item: Item<Value>): item is Choice<Value> {
  return !Separator.isSeparator(item) && !item.disabled;
}

export default async <Value, KeyValue = never>(
  options: SelectConfig<Value, KeyValue>
): Promise<Value | KeyValue | "EVENT_INTERRUPTED"> => {
  const answer = await createPrompt<Value, KeyValue, SelectConfig<Value, KeyValue>>(
    (
      config: SelectConfig<Value, KeyValue>,
      done: (value: Value | KeyValue | "EVENT_INTERRUPTED") => void
    ): string => {
      const {
        choices: items,
        loop = true,
        pageSize = 12,
        actions,
        prefix: initPrefix,
        actionMsg,
        sufix,
        includeSeperators = true,
        historyId = 0,
      } = config;
      const styledActionMessage = actionMsg ? chalk.underline.italic(actionMsg) : "";
      const firstRender = useRef(true);
      const theme = makeTheme<SelectTheme>(selectTheme, config.theme);
      const { isSeparator } = Separator;
      const [status, setStatus] = useState("pending");

      const prefix: string = (initPrefix || "") + usePrefix({ theme }) + " ";
      let page = chalk.grey.bold("0 items");

      const bounds = useMemo(() => {
        const first = items.findIndex((x, id) => isSelectable(x) && id === historyId);
        const last = items.length - 1 - [...items].reverse().findIndex(isSelectable);
        return { first, last };
      }, [items]);

      const defaultItemIndex = useMemo(() => {
        if (!("default" in config)) return -1;
        return items.findIndex((item) => isSelectable(item) && item.value === config.default);
      }, [config.default, items]);

      const [active, setActive] = useState(
        defaultItemIndex === -1 ? bounds.first : defaultItemIndex
      );
      const selectedChoice = items[active];

      useKeypress(async (key, _rl) => {
        if (isEnterKey(key)) {
          setStatus("done");
          done(selectedChoice.value);
        } else if (
          isUpKey(key) ||
          isDownKey(key) ||
          key.name === "tab" ||
          // @ts-ignore
          (key.name === "tab" && key.shift)
        ) {
          if (items.length === 0) return;
          // @ts-ignore
          const shouldGoUp = isUpKey(key) || (key.name === "tab" && key.shift);
          const shouldGoDown = isDownKey(key) || key.name === "tab";
          if (
            loop ||
            (shouldGoUp && active !== bounds.first) ||
            (shouldGoDown && active !== bounds.last)
          ) {
            const offset = shouldGoUp ? -1 : 1;
            let next = active;
            do {
              next = (next + offset + items.length) % items.length;
            } while (!isSelectable(items[next]!));
            setActive(next);
          }
        } else if (isNumberKey(key)) {
          const position = Number(key.name) - 1;
          const item = items[position];
          if (item != null && isSelectable(item)) {
            setActive(position);
          }
        } else if (key.name === "escape") {
          done("EVENT_INTERRUPTED");
        } else {
          if (actions && actions.length > 0) {
            const keyChoice = actions.find((x) => x.key === key.name);
            if (keyChoice) {
              done(keyChoice.value);
            }
          }
        }
      });

      const message = chalk.italic(theme.style.message(config.message));
      if (firstRender.current && items.length <= pageSize) {
        firstRender.current = false;
      }

      if (items.length > 0) {
        page = usePagination<Item<Value>>({
          items,
          active,
          renderItem({ item, isActive }: { item: Item<Value>; isActive: boolean }) {
            if (isSeparator(item)) return `${item.separator}`;

            const line = item.name || item.value;
            if (item.disabled) {
              const disabledLabel =
                typeof item.disabled === "string" ? item.disabled : "(disabled)";
              return theme.style.disabled(`${line} ${disabledLabel}`);
            }
            const color = isActive ? theme.style.highlight : (x: string) => x;
            const cursor = isActive ? theme.icon.cursor : ` `;
            return color(chalk.italic(`${cursor} ${line}`));
          },
          pageSize,
          loop,
          theme,
        });
      }

      const keyActions =
        actions && actions?.length > 0
          ? actions
              ?.map((action) => `${action.name} ${chalk.blueBright("[" + action.key + "]")}`)
              .join("\n")
          : "";

      const keyActionOutput = [styledActionMessage, keyActions].filter(Boolean).join("\n\n");
      const choiceDescription =
        items.length > 0 &&
        selectedChoice.description &&
        `\n${chalk.gray(`${selectedChoice.description}`)}`;

      const separator = new Separator(process.stdout.columns).separator;
      let lheader = prefix + message;
      if (sufix) {
        const length = process.stdout.columns - 1 - stringWidth(lheader) - stringWidth(sufix);
        lheader = lheader = `${lheader}${
          " ".repeat(length >= 0 ? length : process.stdout.columns - stringWidth(sufix)) +
          chalk.gray(sufix)
        }`;
      }

      return [
        lheader,
        includeSeperators && separator,
        page,
        status !== "done" && choiceDescription,
        includeSeperators && separator,
        keyActionOutput,
        status !== "done" && ansiEscapes.cursorHide,
      ]
        .filter(Boolean)
        .join("\n");
    }
  )(options);

  return answer;
};
