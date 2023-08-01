import useMemo from 'rc-util/lib/hooks/useMemo';
import shallowEqual from 'rc-util/lib/isEqual';
import type { GenerateConfig } from '../generate';
import type { CustomFormat, Locale, PresetDate } from '../interface';
import { formatValue, isEqual } from '../utils/dateUtil';

export type ValueTextConfig<DateType> = {
  formatList: (string | CustomFormat<DateType>)[];
  generateConfig: GenerateConfig<DateType>;
  presetList?: PresetDate<DateType | string | [DateType, DateType]>[];
  locale: Locale;
};

export default function useValueTexts<DateType>(
  value: DateType | null,
  { formatList, generateConfig, presetList, locale }: ValueTextConfig<DateType>,
) {
  return useMemo<[string[], string]>(
    () => {
      if (!value) {
        return [[''], ''];
      }

      if (typeof value === 'string') {
        const item = presetList?.find((presetItem) => presetItem.value === value);
        if (item) return [[item.label.toString()], item.label.toString()];
        return [[''], ''];
      }

      // We will convert data format back to first format
      let firstValueText: string = '';
      const fullValueTexts: string[] = [];

      for (let i = 0; i < formatList.length; i += 1) {
        const format = formatList[i];
        const formatStr = formatValue(value, { generateConfig, locale, format });
        fullValueTexts.push(formatStr);

        if (i === 0) {
          firstValueText = formatStr;
        }
      }

      return [fullValueTexts, firstValueText];
    },
    [value, formatList, presetList],
    (prev, next) =>
      // Not Same Date
      typeof prev[0] === 'string' || typeof next[0] === 'string'
        ? !shallowEqual(prev[0], next[0], false)
        : !isEqual(generateConfig, prev[0], next[0]) ||
          // Not Same format
          !shallowEqual(prev[1], next[1], true) ||
          // Not Same format
          !shallowEqual(prev[2], next[2], true),
  );
}
