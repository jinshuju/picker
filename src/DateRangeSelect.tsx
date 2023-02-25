import useMemo from 'rc-util/lib/hooks/useMemo';
import * as React from 'react';
import { useEffect } from 'react';
import type { GenerateConfig } from './generate';
import useTextValueMapping from './hooks/useTextValueMapping';
import useValueTexts from './hooks/useValueTexts';
import type { Locale, OnSelect, RangeValue } from './interface';
import type { Unit } from './TimeUnitSelect';
import TimeUnitSelect from './TimeUnitSelect';
import { getValue, leftPad, updateValues } from './utils/miscUtil';
import { setTime as utilSetTime } from './utils/timeUtil';

function generateUnits(start: number, end: number, step: number, disabledUnits?: number[]) {
  const units: Unit[] = [];
  for (let i = start; i <= end; i += step) {
    units.push({
      label: leftPad(i, 2),
      value: i,
      disabled: (disabledUnits || []).includes(i),
    });
  }
  return units;
}

function shouldUnitsUpdate(prevUnits: Unit[], nextUnits: Unit[]) {
  if (prevUnits.length !== nextUnits.length) return true;
  // if any unit's disabled status is different, the units should be re-evaluted
  for (let i = 0; i < prevUnits.length; i += 1) {
    if (prevUnits[i].disabled !== nextUnits[i].disabled) return true;
  }
  return false;
}

function getTimeInfo<DateType>(
  value: DateType,
  generateConfig: GenerateConfig<DateType>,
  options?: { use12Hours?: boolean } | null | undefined,
) {
  const originHour = value ? generateConfig.getHour(value) : null;
  let hour = originHour;
  let isPM: boolean | undefined;
  const minute = value ? generateConfig.getMinute(value) : null;
  const second = value ? generateConfig.getSecond(value) : null;

  // Should additional logic to handle 12 hours
  if (options?.use12Hours) {
    isPM = hour >= 12; // -1 means should display AM
    hour %= 12;
  }

  return { hour, minute, second, isPM };
}

const hourStep = 1;
const minuteStep = 1;
const secondStep = 1;

type TimeSelectProps<DateType> = {
  value: DateType;
  use12Hours?: boolean;
  generateConfig?: GenerateConfig<DateType>;
  onSelect: OnSelect<DateType>;
  onFocus: React.FocusEventHandler<HTMLElement>;
};

function TimeSelect<DateType>(props: TimeSelectProps<DateType>) {
  const { value, use12Hours, generateConfig, onSelect, onFocus } = props;
  const { hour, isPM, minute, second } = React.useMemo(
    () => getTimeInfo<DateType>(value, generateConfig, { use12Hours }),
    [value, generateConfig, use12Hours],
  );

  const rawHours = generateUnits(0, 23, hourStep);
  const memorizedRawHours = useMemo(() => rawHours, rawHours, shouldUnitsUpdate);

  const hours = React.useMemo(() => {
    if (!use12Hours) return memorizedRawHours;
    return memorizedRawHours
      .filter(isPM ? (hourMeta) => hourMeta.value >= 12 : (hourMeta) => hourMeta.value < 12)
      .map((hourMeta) => {
        const hourValue = hourMeta.value % 12;
        const hourLabel = hourValue === 0 ? '12' : leftPad(hourValue, 2);
        return {
          ...hourMeta,
          label: hourLabel,
          value: hourValue,
        };
      });
  }, [use12Hours, isPM, memorizedRawHours]);

  const minutes = generateUnits(0, 59, minuteStep);
  const seconds = generateUnits(0, 59, secondStep);

  // Set Time
  const setTime = (
    isNewPM: boolean | undefined,
    newHour: number,
    newMinute: number,
    newSecond: number,
  ) => {
    let newDate = value || generateConfig.getNow();

    const mergedHour = Math.max(0, newHour);
    const mergedMinute = Math.max(0, newMinute);
    const mergedSecond = Math.max(0, newSecond);

    newDate = utilSetTime(
      generateConfig,
      newDate,
      !use12Hours || !isNewPM ? mergedHour : mergedHour + 12,
      mergedMinute,
      mergedSecond,
    );

    return newDate;
  };

  return (
    <div style={{ display: 'flex' }}>
      <TimeUnitSelect
        value={hour}
        units={hours}
        onChange={(num) => {
          onSelect(setTime(isPM, num, minute, second), 'mouse');
        }}
        onFocus={onFocus}
      />
      <TimeUnitSelect
        value={minute}
        units={minutes}
        onChange={(num) => {
          onSelect(setTime(isPM, hour, num, second), 'mouse');
        }}
        onFocus={onFocus}
      />
      <TimeUnitSelect
        value={second}
        units={seconds}
        onChange={(num) => {
          onSelect(setTime(isPM, hour, minute, num), 'mouse');
        }}
        onFocus={onFocus}
      />
    </div>
  );
}

export type DateRangeSelectProps<DateType> = {
  showSecond?: boolean;
  value?: RangeValue<DateType>;
  index?: 0 | 1;
  generateConfig: GenerateConfig<DateType>;
  locale: Locale;
  disabled?: [boolean, boolean];
  inputReadOnly?: boolean;
  onChange?: (values: RangeValue<DateType>, notNext?: boolean) => void;
  use12Hours?: boolean;
  onTextChange?: (newText: string, index: 0 | 1) => void;
  open?: boolean;
  setActivePickerIndex: (index: 0 | 1) => void;
  onFocus?: React.FocusEventHandler<HTMLElement>;
};

function DateRangeSelect<DateType>(props: DateRangeSelectProps<DateType>) {
  const {
    value,
    onChange,
    open,
    inputReadOnly,
    onTextChange,
    use12Hours,
    disabled,
    locale,
    generateConfig,
    onFocus,
    setActivePickerIndex,
  } = props;
  const start = getValue(value, 0);
  const end = getValue(value, 1);

  const {
    hour: startHour,
    minute: startMinute,
    second: startSecond,
  } = React.useMemo(
    () => getTimeInfo<DateType>(start, generateConfig, { use12Hours }),
    [start, generateConfig, use12Hours],
  );

  const [startValueTexts, firstStartValueText] = useValueTexts<DateType>(start, {
    locale,
    generateConfig,
    formatList: ['YYYY-MM-DD'],
  });

  const [endValueTexts, firstEndValueText] = useValueTexts<DateType>(end, {
    locale,
    generateConfig,
    formatList: ['YYYY-MM-DD'],
  });

  const [startText, triggerStartTextChange, resetStartText] = useTextValueMapping({
    valueTexts: startValueTexts,
    onTextChange: (newText) =>
      onTextChange(
        `${newText} ${leftPad(startHour, 2)}:${leftPad(startMinute, 2)}:${leftPad(startSecond, 2)}`,
        0,
      ),
  });

  const [endText, triggerEndTextChange, resetEndText] = useTextValueMapping({
    valueTexts: endValueTexts,
    onTextChange: (newText) =>
      onTextChange(
        `${newText} ${leftPad(startHour, 2)}:${leftPad(startMinute, 2)}:${leftPad(startSecond, 2)}`,
        1,
      ),
  });

  useEffect(() => {
    if (!open) {
      if (!startValueTexts.length || startValueTexts[0] === '') {
        triggerStartTextChange('');
      } else if (firstStartValueText !== startText) {
        resetStartText();
      }
      if (!endValueTexts.length || endValueTexts[0] === '') {
        triggerEndTextChange('');
      } else if (firstEndValueText !== endText) {
        resetEndText();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startValueTexts, endValueTexts]);

  return (
    <div>
      <div>
        <input
          disabled={disabled?.[0]}
          readOnly={inputReadOnly}
          value={startText}
          onChange={(e) => {
            triggerStartTextChange(e.target.value);
          }}
          onFocus={(e) => {
            setActivePickerIndex(0);
            onFocus?.(e);
          }}
        />
        <TimeSelect
          value={start}
          generateConfig={generateConfig}
          onSelect={(date: DateType) => onChange(updateValues(value, date, 0), true)}
          onFocus={(e) => {
            setActivePickerIndex(0);
            onFocus?.(e);
          }}
        />
      </div>
      <div>
        <input
          disabled={disabled?.[1]}
          readOnly={inputReadOnly}
          value={endText}
          onChange={(e) => {
            triggerEndTextChange(e.target.value);
          }}
          onFocus={(e) => {
            setActivePickerIndex(1);
            onFocus?.(e);
          }}
        />
        <TimeSelect
          value={end}
          generateConfig={generateConfig}
          onSelect={(date: DateType) => onChange(updateValues(value, date, 1), true)}
          onFocus={(e) => {
            setActivePickerIndex(1);
            onFocus?.(e);
          }}
        />
      </div>
    </div>
  );
}

export default DateRangeSelect;
