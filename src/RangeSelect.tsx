import useMemo from 'rc-util/lib/hooks/useMemo';
import * as React from 'react';
import { useEffect } from 'react';
import type { GenerateConfig } from './generate';
import useTextValueMapping from './hooks/useTextValueMapping';
import useValueTexts from './hooks/useValueTexts';
import type { Locale, RangeValue } from './interface';
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

const useTimeInfo = (value, use12Hours, generateConfig) => {
  return React.useMemo(() => {
    const originHour = value ? generateConfig.getHour(value) : -1;
    let hour = originHour;
    let isPM: boolean | undefined;
    const minute = value ? generateConfig.getMinute(value) : -1;
    const second = value ? generateConfig.getSecond(value) : -1;

    // Should additional logic to handle 12 hours
    if (use12Hours) {
      isPM = hour >= 12; // -1 means should display AM
      hour %= 12;
    }

    return { hour, minute, second, isPM };
  }, [value, use12Hours, generateConfig]);
};

const hourStep = 1;
const minuteStep = 1;
const secondStep = 1;

type TimeSelectProps<DateType> = {
  value: DateType;
  use12Hours?: boolean;
  generateConfig?: GenerateConfig<DateType>;
  onSelect: any;
  onFocus: any;
};

function TimeSelect<DateType>(props: TimeSelectProps<DateType>) {
  const { value, use12Hours, generateConfig, onSelect, onFocus } = props;
  const { hour, isPM, minute, second } = useTimeInfo(value, use12Hours, generateConfig);

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

export type RangeSelectProps<DateType> = {
  showSecond?: boolean;
  value?: RangeValue<DateType>;
  index?: 0 | 1;
  generateConfig: GenerateConfig<DateType>;
  locale: Locale;
  disabled?: [boolean, boolean];
  inputReadOnly?: boolean;
  onChange?: (values: RangeValue<DateType>, notNext?: boolean) => void;
  use12Hours?: boolean;
  onTextChange?: any;
  open?: boolean;
  setMergedActivePickerIndex: any;
};

function RangeSelect<DateType>(props: RangeSelectProps<DateType>) {
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
    setMergedActivePickerIndex,
  } = props;
  const start = getValue(value, 0);
  const end = getValue(value, 1);

  const {
    hour: startHour,
    minute: startMinute,
    second: startSecond,
  } = useTimeInfo(start, use12Hours, generateConfig);

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
  }, [open, startValueTexts, endValueTexts]);

  return (
    <div>
      <div>
        <input
          disabled={disabled[0]}
          readOnly={inputReadOnly}
          value={startText}
          onChange={(e) => {
            triggerStartTextChange(e.target.value);
          }}
          onFocus={() => {
            setMergedActivePickerIndex(0);
          }}
        />
        <TimeSelect
          value={start}
          generateConfig={generateConfig}
          onSelect={(date: DateType) => onChange(updateValues(value, date, 0), true)}
          onFocus={() => {
            setMergedActivePickerIndex(0);
          }}
        />
      </div>
      <div>
        <input
          disabled={disabled?.[0]}
          readOnly={inputReadOnly}
          value={endText}
          onChange={(e) => {
            triggerEndTextChange(e.target.value);
          }}
          onFocus={() => {
            setMergedActivePickerIndex(1);
          }}
        />
        <TimeSelect
          value={end}
          generateConfig={generateConfig}
          onSelect={(date: DateType) => onChange(updateValues(value, date, 1), true)}
          onFocus={() => {
            setMergedActivePickerIndex(1);
          }}
        />
      </div>
    </div>
  );
}

export default RangeSelect;
