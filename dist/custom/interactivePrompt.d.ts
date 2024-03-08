import { Separator, type Theme } from "@inquirer/core";
import type { PartialDeep } from "@inquirer/type";
type SelectTheme = {
    icon: {
        cursor: string;
    };
    style: {
        disabled: (text: string) => string;
    };
};
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
    name?: string;
    description?: string;
    disabled?: boolean | string;
    type?: never;
};
type SelectConfig<Value, KeyValue> = {
    message: string;
    choices: ReadonlyArray<Choice<Value> | Separator>;
    actions?: ReadonlyArray<KeyChoice<KeyValue> | Separator>;
    pageSize?: number;
    loop?: boolean;
    default?: unknown;
    theme?: PartialDeep<Theme<SelectTheme>>;
    prefix?: string;
};
declare const _default: <Value, KeyValue>(options: SelectConfig<Value, KeyValue>) => Promise<any>;
export default _default;
