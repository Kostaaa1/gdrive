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
import ora, { Ora } from "ora";
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
import { TCached } from "../store/store.js";
import { prepareItemsForQuestion } from "../utils/utils.js";

const selectTheme: SelectTheme = {
  icon: { cursor: figures.pointer },
  style: { disabled: (text: string) => chalk.dim(`- ${text}`) },
};

type SelectTheme = {
  icon: { cursor: string };
  style: { disabled: (text: string) => string };
};

type Item<Value> = Separator | Choice<Value>;
export type Choice<Value> = {
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
  choices: TCached | Promise<TCached>;
  actions?: ReadonlyArray<KeyChoice<KeyValue>>;
  actionMsg?: string;
  pageSize?: number;
  loop?: boolean;
  default?: unknown;
  theme?: PartialDeep<Theme<SelectTheme>>;
  prefix?: string;
  sufix?: string | null;
};

function isSelectable<Value>(item: Item<Value>): item is Choice<Value> {
  return !Separator.isSeparator(item) && !item.disabled;
}

export default async <Value, KeyValue = never>(
  options: SelectConfig<Value, KeyValue>
): Promise<Value | KeyValue | "EVENT_INTERRUPTED"> => {
  const { actions, choices, message: messeageNotStyled, sufix, actionMsg } = options;
  const theme = makeTheme<SelectTheme>(selectTheme, options.theme);
  const message = chalk.italic(theme.style.message(messeageNotStyled));
  const styledActionMessage = actionMsg ? chalk.underline.italic(actionMsg) : "";

  const keyActions =
    actions && actions?.length > 0
      ? actions
          ?.map((action) => `${action.name} ${chalk.blueBright("[" + action.key + "]")}`)
          .join("\n")
      : "";

  const keyActionOutput = [styledActionMessage, keyActions].filter(Boolean).join("\n\n");
  const separator = new Separator(process.stdout.columns).separator;
  let lheader = message;

  if (sufix) {
    const length = process.stdout.columns - 4 - stringWidth(lheader) - stringWidth(sufix);
    lheader =
      lheader +
      " ".repeat(length >= 0 ? length : process.stdout.columns - stringWidth(sufix)) +
      chalk.gray(sufix);
  }

  let page = chalk.grey.bold("0 items");
  const msg = [lheader, separator, page, separator, keyActionOutput, ansiEscapes.cursorHide]
    .filter(Boolean)
    .join("\n");

  // let items: { name: string; value: TFile }[];
  let items: Choice<Value>[];
  let spinner: Ora | undefined = undefined;
  let historyId: number;

  if (choices instanceof Promise) {
    spinner = ora(msg).start();
    const data = await choices;
    items = prepareItemsForQuestion(data.items);
    historyId = data.historyId;
  } else {
    items = prepareItemsForQuestion(choices.items);
    historyId = choices.historyId;
  }
  if (spinner) spinner.stop();
  console.log(ansiEscapes.cursorHide);
  console.clear();

  const answer = await createPrompt<Value, KeyValue, SelectConfig<Value, KeyValue>>(
    (
      config: SelectConfig<Value, KeyValue>,
      done: (value: Value | KeyValue | "EVENT_INTERRUPTED") => void
    ): string => {
      const { loop = true, pageSize = 12, actions, prefix: initPrefix } = config;
      const firstRender = useRef(true);
      const theme = makeTheme<SelectTheme>(selectTheme, config.theme);
      const { isSeparator } = Separator;
      let page = chalk.grey.bold("0 items");
      const prefix: string = (initPrefix || "") + usePrefix({ theme }) + " ";

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
          done(selectedChoice.value as Value);
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

      if (firstRender.current && items.length <= pageSize) {
        firstRender.current = false;
      }

      if (items.length > 0) {
        page = usePagination<Item<Value>>({
          items,
          active,
          renderItem({ item, isActive }: { item: Item<Value>; isActive: boolean }) {
            if (isSeparator(item)) {
              return `${item.separator}`;
            }
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

      const choiceDescription =
        items.length > 0 &&
        selectedChoice.description &&
        `${chalk.gray(`${selectedChoice.description}`)}`;

      return [
        `${prefix}${lheader}`,
        separator,
        page,
        choiceDescription,
        separator,
        keyActionOutput,
        ansiEscapes.cursorHide,
      ]
        .filter(Boolean)
        .join("\n");
    }
  )(options);

  return answer;
};
