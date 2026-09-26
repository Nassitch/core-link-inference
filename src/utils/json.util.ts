import { JsonValue } from './json.type.js';

export class JsonUtil {
  static stringifyPythonStyle(value: JsonValue): string {
    if (Array.isArray(value)) {
      return `[${value.map(JsonUtil.stringifyPythonStyle).join(', ')}]`;
    }
    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${JsonUtil.stringifyPythonStyle(item)}`);
      return `{${entries.join(', ')}}`;
    }
    return JSON.stringify(value);
  }

  static toText(value: JsonValue): string {
    return typeof value === 'string' ? value : JsonUtil.stringifyPythonStyle(value);
  }
}
