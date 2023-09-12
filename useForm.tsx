import { useComputed, useSignal } from "@preact/signals";

const flatten = (obj, path = "") => {
  if (!(obj instanceof Object)) return { [path.replace(/\.$/g, "")]: obj };
  return Object.keys(obj).reduce((output, key) => {
    return { ...output, ...flatten(obj[key], path + key + ".") };
  }, {});
};

const dotFind = (key, data = {}) =>
  key.split(".").reduce((ob, i) => ob?.[i], data);

function dotToObject(data) {
  function index(parent, key, value) {
    const [mainKey, ...children] = key.split(".");
    parent[mainKey] = parent[mainKey] || (isNaN(children[0]) ? {} : []);
    if (children.length === 1) parent[mainKey][children[0]] = value;
    else index(parent[mainKey], children.join("."), value);
  }
  const result = Object.entries(data).reduce((acc, [key, value]) => {
    if (key.includes(".")) index(acc, key, value);
    else acc[key] = value;
    return acc;
  }, {});
  return result;
}
const reducer = (
  state: any,
  payload: { name: string; value?: string | boolean | null }
) => {
  return dotToObject({ ...state, [payload.name]: payload.value });
};

const toNum = (v: string | undefined) => (typeof v === "string" ? +v : v);

interface FormOptions {
  onChange?: (e: Event) => unknown;
  valueAsNumber?: boolean;
}

export const useForm = ({ initialState = {} } = {}) => {
  const state = useSignal(initialState);
  const set = (name, value) => {
    state.value = globalThis.structuredClone(
      reducer(state.value, { name, value })
    );
  };
  const register = (
    name: string,
    options: FormOptions | ((opts: FormOptions) => FormOptions) | undefined
  ) => {
    const ref = useSignal();
    const refFn = (node) => (ref.value = node);
    const value = useComputed(() => dotFind(name, state.value));
    const isOptFn = typeof options === "function";
    const Fn = isOptFn ? options : (v: FormOptions) => v;
    const t = !isOptFn && options?.valueAsNumber ? toNum : (v: string) => v;
    const { onChange } = Fn({
      onChange: (e) =>
        e?.target?.type === "checkbox"
          ? set(name, e?.target?.checked ?? e)
          : set(name, t(e?.target?.value ?? e)),
    });
    return { onChange, name, value, checked: value, ref: refFn };
  };
  const control = state;
  const reset = (nextState) => {
    state.value = nextState;
  };
  const handleSubmit = (fn) => (e) => {
    e.preventDefault();
    fn(state.value, e);
  };
  return { control, register, reset, handleSubmit, set };
};

export const useFieldArray = ({ control, name }) => {
  const fields = useComputed(() => [...(dotFind(name, control.value) ?? [])]);
  const remove = (idx) => {
    const fields = dotFind(name, control.value);
    if (fields?.length > 0)
      control.value = reducer(control.value, {
        name,
        value: fields.filter(
          (_, idx1, arr) =>
            idx1 !== (typeof idx === "number" ? idx : arr.length - 1)
        ),
      });
  };
  const insert = (value = {}) => {
    const fields = dotFind(name, control.value);
    control.value = reducer(control.value, {
      name: `${name}.${fields?.length ?? 0}`,
      value,
    });
  };
  return { fields, remove, insert };
};
