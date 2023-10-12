import classNames from 'classnames';
import type { SelectProps } from 'rc-select';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import warning from 'rc-util/lib/warning';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PickerPanelProps } from '.';
import DateRangeSelect from './DateRangeSelect';
import type { GenerateConfig } from './generate';
import useHoverValue from './hooks/useHoverValue';
import usePickerInput from './hooks/usePickerInput';
import usePresets from './hooks/usePresets';
import useRangeDisabled from './hooks/useRangeDisabled';
import useRangeViewDates from './hooks/useRangeViewDates';
import useTextValueMapping from './hooks/useTextValueMapping';
import useValueTexts from './hooks/useValueTexts';
import type {
  DisabledTimes,
  EventValue,
  PanelMode,
  PickerMode,
  PresetDate,
  RangeValue,
} from './interface';
import type { ContextOperationRefProps } from './PanelContext';
import PanelContext from './PanelContext';
import type { DateRender } from './panels/DatePanel/DateBody';
import type { SharedTimeProps } from './panels/TimePanel';
import type { PickerBaseProps, PickerDateProps, PickerRefConfig, PickerTimeProps } from './Picker';
import PickerPanel from './PickerPanel';
import PickerTrigger from './PickerTrigger';
import PresetPanel from './PresetPanel';
import RangeContext from './RangeContext';

import {
  formatValue,
  getClosingViewDate,
  isEqual,
  isSameDate,
  isSameQuarter,
  isSameWeek,
  parseValue,
} from './utils/dateUtil';
import getExtraFooter from './utils/getExtraFooter';
import getRanges from './utils/getRanges';
import getDataOrAriaProps, { getValue, toArray, updateValues } from './utils/miscUtil';
import { elementsContains, getDefaultFormat, getInputSize } from './utils/uiUtil';
import { legacyPropsWarning } from './utils/warnUtil';

function reorderValues<DateType>(
  values: Exclude<RangeValue<DateType>, string>,
  generateConfig: GenerateConfig<DateType>,
): Exclude<RangeValue<DateType>, string> {
  if (values && values[0] && values[1] && generateConfig.isAfter(values[0], values[1])) {
    return [values[1], values[0]];
  }

  return values;
}

function canValueTrigger<DateType>(
  value: EventValue<DateType>,
  index: number,
  disabled: [boolean, boolean],
  allowEmpty?: [boolean, boolean] | null,
): boolean {
  if (value) {
    return true;
  }

  if (allowEmpty && allowEmpty[index]) {
    return true;
  }

  if (disabled[(index + 1) % 2]) {
    return true;
  }

  return false;
}

export type RangeType = 'start' | 'end';

export type RangeInfo = {
  range: RangeType;
};

export type RangeDateRender<DateType> = (
  currentDate: DateType,
  today: DateType,
  info: RangeInfo,
) => React.ReactNode;

export type RangePickerSharedProps<DateType> = {
  id?: string;
  value?: RangeValue<DateType>;
  defaultValue?: RangeValue<DateType>;
  defaultPickerValue?: [DateType, DateType];
  placeholder?: [string, string];
  disabled?: boolean | [boolean, boolean];
  disabledTime?: (date: EventValue<DateType>, type: RangeType) => DisabledTimes;
  presets?: PresetDate<Exclude<RangeValue<DateType>, null>>[];
  /** @deprecated Please use `presets` instead */
  ranges?: Record<
    string,
    Exclude<RangeValue<DateType>, null> | (() => Exclude<RangeValue<DateType>, null>)
  >;
  separator?: React.ReactNode;
  allowEmpty?: [boolean, boolean];
  mode?: [PanelMode, PanelMode];
  onChange?: (values: RangeValue<DateType>, formatString?: [string, string]) => void;
  onCalendarChange?: (
    values: RangeValue<DateType>,
    formatString: [string, string],
    info: RangeInfo,
  ) => void;
  onPanelChange?: (values: RangeValue<DateType>, modes: [PanelMode, PanelMode]) => void;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onOk?: (dates: RangeValue<DateType>) => void;
  direction?: 'ltr' | 'rtl';
  autoComplete?: string;
  /** @private Internal control of active picker. Do not use since it's private usage */
  activePickerIndex?: 0 | 1;
  dateRender?: RangeDateRender<DateType>;
  panelRender?: (originPanel: React.ReactNode) => React.ReactNode;
};

type OmitPickerProps<Props> = Omit<
  Props,
  | 'value'
  | 'defaultValue'
  | 'defaultPickerValue'
  | 'placeholder'
  | 'disabled'
  | 'disabledTime'
  | 'showToday'
  | 'showTime'
  | 'mode'
  | 'onChange'
  | 'onSelect'
  | 'onPanelChange'
  | 'pickerValue'
  | 'onPickerValueChange'
  | 'onOk'
  | 'dateRender'
  | 'presets'
>;

export type RangeShowTimeObject<DateType> = Omit<SharedTimeProps<DateType>, 'defaultValue'> & {
  defaultValue?: DateType[];
};

export type RangePickerBaseProps<DateType> = {} & RangePickerSharedProps<DateType> &
  OmitPickerProps<PickerBaseProps<DateType>>;

export type RangePickerDateProps<DateType> = {
  showTime?: boolean | RangeShowTimeObject<DateType>;
  timeSelectProps?: SelectProps;
} & RangePickerSharedProps<DateType> &
  OmitPickerProps<PickerDateProps<DateType>>;

export type RangePickerTimeProps<DateType> = {
  order?: boolean;
} & RangePickerSharedProps<DateType> &
  OmitPickerProps<PickerTimeProps<DateType>>;

export type RangePickerProps<DateType> =
  | RangePickerBaseProps<DateType>
  | RangePickerDateProps<DateType>
  | RangePickerTimeProps<DateType>;

// TMP type to fit for ts 3.9.2
type OmitType<DateType> = Omit<RangePickerBaseProps<DateType>, 'picker' | 'presets'> &
  Omit<RangePickerDateProps<DateType>, 'picker'> &
  Omit<RangePickerTimeProps<DateType>, 'picker'>;

type MergedRangePickerProps<DateType> = {
  picker?: PickerMode;
} & OmitType<DateType>;

function InnerRangePicker<DateType>(props: RangePickerProps<DateType>) {
  const {
    prefixCls = 'rc-picker',
    timeSelectProps,
    id,
    style,
    className,
    popupStyle,
    dropdownClassName,
    transitionName,
    dropdownAlign,
    getPopupContainer,
    generateConfig,
    locale,
    placeholder,
    autoFocus,
    disabled,
    format,
    picker = 'date',
    showTime,
    use12Hours,
    separator = '~',
    value,
    defaultValue,
    defaultPickerValue,
    open,
    defaultOpen,
    disabledDate,
    disabledTime,
    dateRender,
    panelRender,
    presets,
    ranges,
    allowEmpty,
    allowClear,
    suffixIcon,
    prefixIcon,
    clearIcon,
    pickerRef,
    inputReadOnly,
    mode,
    renderExtraFooter,
    onChange,
    onOpenChange,
    onPanelChange,
    onCalendarChange,
    onFocus,
    onBlur,
    onMouseDown,
    onMouseUp,
    onMouseEnter,
    onMouseLeave,
    onClick,
    onOk,
    onKeyDown,
    components,
    order,
    direction,
    activePickerIndex,
    autoComplete = 'off',
    presetsHeader,
  } = props as MergedRangePickerProps<DateType>;

  const needConfirmButton: boolean = picker === 'time';

  // We record opened status here in case repeat open with picker
  const openRecordsRef = useRef<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const panelDivRef = useRef<HTMLDivElement>(null);
  const startInputDivRef = useRef<HTMLDivElement>(null);
  const endInputDivRef = useRef<HTMLDivElement>(null);
  const separatorRef = useRef<HTMLDivElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const prefixRef = useRef<HTMLDivElement>(null);

  // ============================ Warning ============================
  if (process.env.NODE_ENV !== 'production') {
    legacyPropsWarning(props);
  }

  // ============================= Misc ==============================
  const formatList = toArray(getDefaultFormat<DateType>(format, picker, showTime, use12Hours));

  // Active picker
  const [mergedActivePickerIndex, setMergedActivePickerIndex] = useMergedState<0 | 1>(0, {
    value: activePickerIndex,
  });

  // Operation ref
  const operationRef: React.MutableRefObject<ContextOperationRefProps | null> =
    useRef<ContextOperationRefProps>(null);

  // ============================= Value =============================
  const [mergedValue, setInnerValue] = useMergedState<RangeValue<DateType>>(null, {
    value,
    defaultValue,
    postState: (values) =>
      picker === 'time' && !order
        ? values
        : typeof values !== 'string'
        ? reorderValues(values, generateConfig)
        : values,
  });

  const mergedDisabled = React.useMemo<[boolean, boolean]>(() => {
    if (typeof mergedValue === 'string') {
      return [false, false];
    }

    if (Array.isArray(disabled)) {
      return disabled;
    }

    return [disabled || false, disabled || false];
  }, [disabled, mergedValue]);

  // =========================== View Date ===========================
  // Config view panel
  const [getViewDate, setViewDate] = useRangeViewDates({
    values: typeof mergedValue === 'string' ? null : mergedValue,
    picker,
    defaultDates: defaultPickerValue,
    generateConfig,
  });

  // ========================= Select Values =========================
  const [selectedValue, setSelectedValue] = useMergedState<RangeValue<DateType>>(mergedValue, {
    postState: (values) => {
      let postValues = values;

      if (mergedDisabled[0] && mergedDisabled[1]) {
        return postValues;
      }

      // Fill disabled unit
      for (let i = 0; i < 2; i += 1) {
        if (
          mergedDisabled[i] &&
          typeof postValues !== 'string' &&
          !getValue(postValues, i) &&
          !getValue(allowEmpty, i)
        ) {
          postValues = updateValues(postValues, generateConfig.getNow(), i);
        }
      }
      return postValues;
    },
  });

  // ============================= Modes =============================
  const [mergedModes, setInnerModes] = useMergedState<[PanelMode, PanelMode]>([picker, picker], {
    value: mode,
  });

  useEffect(() => {
    setInnerModes([picker, picker]);
  }, [picker]);

  const triggerModesChange = (modes: [PanelMode, PanelMode], values: RangeValue<DateType>) => {
    setInnerModes(modes);

    if (onPanelChange) {
      onPanelChange(values, modes);
    }
  };

  // ========================= Disable Date ==========================
  const [disabledStartDate, disabledEndDate] = useRangeDisabled(
    {
      picker,
      selectedValue: typeof selectedValue === 'string' ? null : selectedValue,
      locale,
      disabled: mergedDisabled,
      disabledDate,
      generateConfig,
    },
    openRecordsRef.current[1],
    openRecordsRef.current[0],
  );

  // ============================= Open ==============================
  const [mergedOpen, triggerInnerOpen] = useMergedState(false, {
    value: open,
    defaultValue: defaultOpen,
    postState: (postOpen) => (mergedDisabled[mergedActivePickerIndex] ? false : postOpen),
    onChange: (newOpen) => {
      if (onOpenChange) {
        onOpenChange(newOpen);
      }

      if (!newOpen && operationRef.current && operationRef.current.onClose) {
        operationRef.current.onClose();
      }
    },
  });

  const startOpen = mergedOpen && mergedActivePickerIndex === 0;
  const endOpen = mergedOpen && mergedActivePickerIndex === 1;

  // ============================= Popup =============================
  // Popup min width
  const [popupMinWidth, setPopupMinWidth] = useState(0);
  useEffect(() => {
    if (!mergedOpen && containerRef.current) {
      setPopupMinWidth(containerRef.current.offsetWidth);
    }
  }, [mergedOpen]);

  // ============================ Trigger ============================
  const triggerRef = React.useRef<any>();

  function triggerOpen(newOpen: boolean, index: 0 | 1) {
    if (newOpen) {
      clearTimeout(triggerRef.current);
      openRecordsRef.current[index] = true;

      setMergedActivePickerIndex(index);
      triggerInnerOpen(newOpen);

      // Open to reset view date
      if (!mergedOpen) {
        setViewDate(null, index);
      }
    } else if (mergedActivePickerIndex === index) {
      triggerInnerOpen(newOpen);

      // Clean up async
      // This makes ref not quick refresh in case user open another input with blur trigger
      const openRecords = openRecordsRef.current;
      triggerRef.current = setTimeout(() => {
        if (openRecords === openRecordsRef.current) {
          openRecordsRef.current = {};
        }
      });
    }
  }

  function triggerOpenAndFocus(index: 0 | 1) {
    triggerOpen(true, index);
    // Use setTimeout to make sure panel DOM exists
    setTimeout(() => {
      const inputRef = [startInputRef, endInputRef][index];
      if (inputRef?.current) {
        inputRef.current?.focus();
      }
    }, 0);
  }

  function closeOpenAndFocus(index: 0 | 1) {
    triggerOpen(false, index);
    // Use setTimeout to make sure panel DOM exists
    setTimeout(() => {
      const inputRef = [startInputRef, endInputRef][index];
      if (inputRef?.current) {
        inputRef.current?.focus();
      }
    }, 0);
  }

  function triggerChange(newValue: RangeValue<DateType>, sourceIndex: 0 | 1, notNext?: boolean) {
    let values = newValue;
    if (typeof values === 'string') {
      return setSelectedValue(values);
    }

    let startValue = getValue(values, 0);
    let endValue = getValue(values, 1);

    // >>>>> Format start & end values
    if (startValue && endValue && generateConfig.isAfter(startValue, endValue)) {
      if (
        // WeekPicker only compare week
        (picker === 'week' && !isSameWeek(generateConfig, locale.locale, startValue, endValue)) ||
        // QuotaPicker only compare week
        (picker === 'quarter' && !isSameQuarter(generateConfig, startValue, endValue)) ||
        // Other non-TimePicker compare date
        (picker !== 'week' &&
          picker !== 'quarter' &&
          picker !== 'time' &&
          !isSameDate(generateConfig, startValue, endValue))
      ) {
        // Clean up end date when start date is after end date
        if (sourceIndex === 0) {
          values = [startValue, null];
          endValue = null;
        } else {
          startValue = null;
          values = [null, endValue];
        }

        // Clean up cache since invalidate
        openRecordsRef.current = {
          [sourceIndex]: true,
        };
      } else if (picker !== 'time' || order !== false) {
        // Reorder when in same date
        values = reorderValues(values, generateConfig);
      }
    }

    setSelectedValue(values);

    // >>>>> Open picker when

    const startStr =
      values && values[0]
        ? formatValue(values[0], { generateConfig, locale, format: formatList[0] })
        : '';
    const endStr =
      values && values[1]
        ? formatValue(values[1], { generateConfig, locale, format: formatList[0] })
        : '';

    if (onCalendarChange) {
      const info: RangeInfo = { range: sourceIndex === 0 ? 'start' : 'end' };
      onCalendarChange(values, [startStr, endStr], info);
    }

    // Always open another picker if possible
    let nextOpenIndex: 0 | 1 = null;
    if (sourceIndex === 0 && !mergedDisabled[1] && !notNext) {
      nextOpenIndex = 1;
    } else if (sourceIndex === 1 && !mergedDisabled[0] && !notNext) {
      nextOpenIndex = 0;
    }

    if (
      nextOpenIndex !== null &&
      nextOpenIndex !== mergedActivePickerIndex &&
      (!openRecordsRef.current[nextOpenIndex] || !getValue(values, nextOpenIndex)) &&
      getValue(values, sourceIndex)
    ) {
      // Delay to focus to avoid input blur trigger expired selectedValues
      triggerOpenAndFocus(nextOpenIndex);
    } else if (!showTime) {
      closeOpenAndFocus(sourceIndex);
      triggerConfirm(values);
    }
  }

  function triggerConfirm(newValue: RangeValue<DateType>) {
    const values = newValue;
    if (typeof values === 'string') {
      setInnerValue(values);
      if (onChange && mergedValue !== values) {
        onChange(values);
      }
    } else {
      const startValue = getValue(values, 0);
      const endValue = getValue(values, 1);

      const startStr =
        values && values[0]
          ? formatValue(values[0], { generateConfig, locale, format: formatList[0] })
          : '';
      const endStr =
        values && values[1]
          ? formatValue(values[1], { generateConfig, locale, format: formatList[0] })
          : '';

      // >>>>> Trigger `onChange` event
      const canStartValueTrigger = canValueTrigger(startValue, 0, mergedDisabled, allowEmpty);
      const canEndValueTrigger = canValueTrigger(endValue, 1, mergedDisabled, allowEmpty);
      const canTrigger = values === null || (canStartValueTrigger && canEndValueTrigger);
      if (canTrigger) {
        // Trigger onChange only when value is validate
        setInnerValue(values);

        if (typeof mergedValue !== 'string' && onChange) {
          if (
            !isEqual(generateConfig, getValue(mergedValue, 0), startValue) ||
            !isEqual(generateConfig, getValue(mergedValue, 1), endValue)
          ) {
            onChange(values, [startStr, endStr]);
          }
        }

        if (typeof mergedValue === 'string' && onChange) {
          onChange(values, [startStr, endStr]);
        }
      }
    }

    // close
    triggerOpen(false, mergedActivePickerIndex);
  }

  const forwardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (mergedOpen && operationRef.current && operationRef.current.onKeyDown) {
      // Let popup panel handle keyboard
      return operationRef.current.onKeyDown(e);
    }

    /* istanbul ignore next */
    /* eslint-disable no-lone-blocks */
    {
      warning(
        false,
        'Picker not correct forward KeyDown operation. Please help to fire issue about this.',
      );
      return false;
    }
  };
  // ============================ Ranges =============================
  const presetList = usePresets(presets, ranges);
  // ============================= Text ==============================
  const sharedTextHooksProps = {
    formatList,
    generateConfig,
    locale,
    presetList,
  };

  const [startValueTexts, firstStartValueText] = useValueTexts<DateType | string>(
    typeof selectedValue === 'string' ? selectedValue : getValue(selectedValue, 0),
    sharedTextHooksProps,
  );

  const [endValueTexts, firstEndValueText] = useValueTexts<DateType | string>(
    typeof selectedValue === 'string' ? selectedValue : getValue(selectedValue, 1),
    sharedTextHooksProps,
  );

  const onTextChange = (newText: string, index: 0 | 1, dateFormat?: string) => {
    const inputDate = parseValue(newText, {
      locale,
      formatList: dateFormat ? [dateFormat] : formatList,
      generateConfig,
      presetList,
    });

    const disabledFunc = index === 0 ? disabledStartDate : disabledEndDate;
    if (typeof inputDate === 'string') {
      if (index === 0) {
        setSelectedValue(inputDate);
      }
    } else {
      if (inputDate && !disabledFunc(inputDate)) {
        setSelectedValue(
          updateValues(typeof selectedValue === 'string' ? null : selectedValue, inputDate, index),
        );
        setViewDate(inputDate, index);
      }
    }
  };

  const [startText, triggerStartTextChange, resetStartText] = useTextValueMapping({
    valueTexts: startValueTexts,
    onTextChange: (newText) => onTextChange(newText, 0),
  });

  const [endText, triggerEndTextChange, resetEndText] = useTextValueMapping({
    valueTexts: endValueTexts,
    onTextChange: (newText) => onTextChange(newText, 1),
  });

  const [rangeHoverValue, setRangeHoverValue] =
    useState<Exclude<RangeValue<DateType>, string>>(null);

  // ========================== Hover Range ==========================
  const [hoverRangedValue, setHoverRangedValue] =
    useState<Exclude<RangeValue<DateType>, string>>(null);

  const [startHoverValue, onStartEnter, onStartLeave] = useHoverValue(startText, {
    formatList,
    generateConfig,
    locale,
  });

  const [endHoverValue, onEndEnter, onEndLeave] = useHoverValue(endText, {
    formatList,
    generateConfig,
    locale,
  });

  const onDateMouseEnter = (date: DateType) => {
    if (typeof selectedValue === 'string') return;
    setHoverRangedValue(updateValues(selectedValue, date, mergedActivePickerIndex));
    if (mergedActivePickerIndex === 0) {
      onStartEnter(date);
    } else {
      onEndEnter(date);
    }
  };

  const onDateMouseLeave = () => {
    if (typeof selectedValue === 'string') return;
    setHoverRangedValue(updateValues(selectedValue, null, mergedActivePickerIndex));
    if (mergedActivePickerIndex === 0) {
      onStartLeave();
    } else {
      onEndLeave();
    }
  };

  // ============================= Input =============================
  const getSharedInputHookProps = (index: 0 | 1, resetText: () => void) => ({
    blurToCancel: needConfirmButton,
    forwardKeyDown,
    onBlur,
    isClickOutside: (target: EventTarget | null) =>
      !elementsContains(
        [
          panelDivRef.current,
          startInputDivRef.current,
          endInputDivRef.current,
          containerRef.current,
        ],
        target as HTMLElement,
      ),
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      setMergedActivePickerIndex(index);
      if (onFocus) {
        onFocus(e);
      }
    },
    triggerOpen: (newOpen: boolean) => {
      triggerOpen(newOpen, index);
    },
    onSubmit: () => {
      if (
        // When user typing disabledDate with keyboard and enter, this value will be empty
        !selectedValue ||
        // Normal disabled check
        (disabledDate && typeof selectedValue !== 'string' && disabledDate(selectedValue[index]))
      ) {
        return false;
      }

      triggerChange(selectedValue, index);
    },
    onCancel: () => {
      triggerOpen(false, index);
      setSelectedValue(mergedValue);
      resetText();
    },
  });

  const [
    startInputProps,
    { focused: startFocused, setFocused: setStartFocused, typing: startTyping },
  ] = usePickerInput({
    ...getSharedInputHookProps(0, resetStartText),
    open: startOpen,
    value: startText,
    inputRef: startInputRef,
    onKeyDown: (e, preventDefault) => {
      onKeyDown?.(e, preventDefault);
    },
  });

  const [endInputProps, { focused: endFocused, setFocused: setEndFocused, typing: endTyping }] =
    usePickerInput({
      ...getSharedInputHookProps(1, resetEndText),
      open: endOpen,
      value: endText,
      onKeyDown: (e, preventDefault) => {
        onKeyDown?.(e, preventDefault);
      },
      inputRef: endInputRef,
    });

  // ========================== Click Picker ==========================
  const onPickerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // When click inside the picker & outside the picker's input elements
    // the panel should still be opened
    if (onClick) {
      onClick(e);
    }
    if (
      !mergedOpen &&
      !startInputRef?.current?.contains(e.target as Node) &&
      !endInputRef?.current?.contains(e.target as Node)
    ) {
      if (!mergedDisabled[0]) {
        triggerOpenAndFocus(0);
      } else if (!mergedDisabled[1]) {
        triggerOpenAndFocus(1);
      }
    }
  };

  const onPickerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // shouldn't affect input elements if picker is active
    if (onMouseDown) {
      onMouseDown(e);
    }
    if (
      mergedOpen &&
      (startFocused || endFocused) &&
      !startInputRef?.current?.contains(e.target as Node) &&
      !endInputRef?.current?.contains(e.target as Node)
    ) {
      e.preventDefault();
    }
  };

  // ============================= Sync ==============================
  // Close should sync back with text value
  const startStr =
    Array.isArray(mergedValue) && mergedValue[0]
      ? formatValue(mergedValue[0], {
          locale,
          format: 'YYYYMMDDHHmmss',
          generateConfig,
        })
      : mergedValue;
  const endStr =
    Array.isArray(mergedValue) && mergedValue[1]
      ? formatValue(mergedValue[1], {
          locale,
          format: 'YYYYMMDDHHmmss',
          generateConfig,
        })
      : mergedValue;

  useEffect(() => {
    if (!mergedOpen) {
      setSelectedValue(mergedValue);

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
  }, [mergedOpen, startValueTexts, endValueTexts]);

  // Sync innerValue with control mode
  useEffect(() => {
    setSelectedValue(mergedValue);
  }, [startStr, endStr]);

  // ============================ Warning ============================
  if (process.env.NODE_ENV !== 'production') {
    if (
      value &&
      Array.isArray(disabled) &&
      typeof value !== 'string' &&
      ((getValue(disabled, 0) && !getValue(value, 0)) ||
        (getValue(disabled, 1) && !getValue(value, 1)))
    ) {
      warning(
        false,
        '`disabled` should not set with empty `value`. You should set `allowEmpty` or `value` instead.',
      );
    }
  }

  // ============================ Private ============================
  if (pickerRef) {
    pickerRef.current = {
      focus: () => {
        if (startInputRef?.current) {
          startInputRef?.current?.focus();
        }
      },
      blur: () => {
        if (startInputRef?.current) {
          startInputRef?.current?.blur();
        }
        if (endInputRef?.current) {
          endInputRef?.current?.blur();
        }
      },
    };
  }

  // ============================= Panel =============================
  function renderPanel(
    panelPosition: 'left' | 'right' | false = false,
    panelProps: Partial<PickerPanelProps<DateType>> = {},
  ) {
    let panelHoverRangedValue: Exclude<RangeValue<DateType>, string> = null;
    if (
      mergedOpen &&
      hoverRangedValue &&
      hoverRangedValue[0] &&
      hoverRangedValue[1] &&
      generateConfig.isAfter(hoverRangedValue[1], hoverRangedValue[0])
    ) {
      panelHoverRangedValue = hoverRangedValue;
    }

    let panelShowTime: boolean | SharedTimeProps<DateType> | undefined =
      showTime as SharedTimeProps<DateType>;
    if (showTime && typeof showTime === 'object' && showTime.defaultValue) {
      const timeDefaultValues: DateType[] = showTime.defaultValue!;
      panelShowTime = {
        ...showTime,
        defaultValue: getValue(timeDefaultValues, mergedActivePickerIndex) || undefined,
      };
    }

    let panelDateRender: DateRender<DateType> | null = null;
    if (dateRender) {
      panelDateRender = (date, today) =>
        dateRender(date, today, {
          range: mergedActivePickerIndex ? 'end' : 'start',
        });
    }

    const rangedValue =
      rangeHoverValue || (typeof selectedValue === 'string' ? undefined : selectedValue);

    return (
      <RangeContext.Provider
        value={{
          inRange: true,
          panelPosition,
          rangedValue,
          hoverRangedValue: panelHoverRangedValue,
        }}
      >
        <PickerPanel<DateType>
          {...(props as any)}
          {...panelProps}
          dateRender={panelDateRender}
          showTime={false}
          showTimeDefaultValue={panelShowTime?.defaultValue}
          mode={mergedModes[mergedActivePickerIndex]}
          generateConfig={generateConfig}
          style={undefined}
          direction={direction}
          disabledDate={mergedActivePickerIndex === 0 ? disabledStartDate : disabledEndDate}
          disabledTime={(date) => {
            if (disabledTime) {
              return disabledTime(date, mergedActivePickerIndex === 0 ? 'start' : 'end');
            }
            return false;
          }}
          className={classNames({
            [`${prefixCls}-panel-focused`]:
              mergedActivePickerIndex === 0 ? !startTyping : !endTyping,
          })}
          value={
            typeof selectedValue !== 'string'
              ? getValue(selectedValue, mergedActivePickerIndex)
              : null
          }
          locale={locale}
          tabIndex={-1}
          onPanelChange={(date, newMode) => {
            // clear hover value when panel change
            if (mergedActivePickerIndex === 0) {
              onStartLeave(true);
            }
            if (mergedActivePickerIndex === 1) {
              onEndLeave(true);
            }
            triggerModesChange(
              updateValues(mergedModes, newMode, mergedActivePickerIndex),
              updateValues(
                typeof selectedValue !== 'string' ? selectedValue : null,
                date,
                mergedActivePickerIndex,
              ),
            );

            let viewDate = date;
            if (panelPosition === 'right' && mergedModes[mergedActivePickerIndex] === newMode) {
              viewDate = getClosingViewDate(viewDate, newMode as any, generateConfig, -1);
            }
            setViewDate(viewDate, mergedActivePickerIndex);
          }}
          onOk={null}
          onSelect={undefined}
          onChange={undefined}
          defaultValue={
            typeof selectedValue === 'string'
              ? undefined
              : mergedActivePickerIndex === 0
              ? getValue(selectedValue, 1)
              : getValue(selectedValue, 0)
          }
          // defaultPickerValue={undefined}
        />
      </RangeContext.Provider>
    );
  }

  let arrowLeft: number = prefixRef?.current?.offsetWidth ?? 0;
  let panelLeft: number = prefixRef?.current?.offsetWidth ?? 0;
  if (
    mergedActivePickerIndex &&
    startInputDivRef.current &&
    separatorRef.current &&
    panelDivRef.current
  ) {
    // Arrow offset
    arrowLeft =
      startInputDivRef.current.offsetWidth +
      separatorRef.current.offsetWidth +
      (prefixRef?.current?.offsetWidth ?? 0);

    // If panelWidth - arrowWidth - arrowMarginLeft < arrowLeft, panel should move to right side.
    // If arrowOffsetLeft > arrowLeft, arrowMarginLeft = arrowOffsetLeft - arrowLeft
    const arrowMarginLeft =
      arrowRef.current.offsetLeft > arrowLeft
        ? arrowRef.current.offsetLeft - arrowLeft
        : arrowRef.current.offsetLeft;

    if (
      panelDivRef.current.offsetWidth !== undefined &&
      arrowRef.current.offsetWidth !== undefined &&
      arrowLeft >
        panelDivRef.current.offsetWidth -
          arrowRef.current.offsetWidth -
          (direction === 'rtl' ? 0 : arrowMarginLeft)
    ) {
      panelLeft = arrowLeft;
    }
  }

  const arrowPositionStyle = direction === 'rtl' ? { right: arrowLeft } : { left: arrowLeft };

  function renderPanels() {
    let panels: React.ReactNode;
    const extraNode = getExtraFooter(
      prefixCls,
      mergedModes[mergedActivePickerIndex],
      renderExtraFooter,
    );

    const rangesNode = getRanges({
      prefixCls,
      components,
      needConfirmButton,
      okDisabled:
        typeof selectedValue === 'string' ||
        !getValue(selectedValue, mergedActivePickerIndex) ||
        (disabledDate && disabledDate(selectedValue[mergedActivePickerIndex])),
      locale,
      // rangeList,
      onOk: () => {
        if (typeof selectedValue === 'string') return;
        if (getValue(selectedValue, mergedActivePickerIndex)) {
          // triggerChangeOld(selectedValue);
          triggerChange(selectedValue, mergedActivePickerIndex);
          if (onOk) {
            onOk(selectedValue);
          }
        }
      },
    });

    if (picker !== 'time') {
      const viewDate = getViewDate(mergedActivePickerIndex);

      const nextViewDate = getClosingViewDate(viewDate, picker, generateConfig);
      const currentMode = mergedModes[mergedActivePickerIndex];

      const showDoublePanel = currentMode === picker;
      const leftPanel = renderPanel(showDoublePanel ? 'left' : false, {
        pickerValue: viewDate,
        onPickerValueChange: (newViewDate) => {
          setViewDate(newViewDate, mergedActivePickerIndex);
        },
      });

      const rightPanel = renderPanel('right', {
        pickerValue: nextViewDate,
        onPickerValueChange: (newViewDate) => {
          setViewDate(
            getClosingViewDate(newViewDate, picker, generateConfig, -1),
            mergedActivePickerIndex,
          );
        },
      });

      if (direction === 'rtl') {
        panels = (
          <>
            {rightPanel}
            {showDoublePanel && leftPanel}
          </>
        );
      } else {
        panels = (
          <>
            {leftPanel}
            {showDoublePanel && rightPanel}
          </>
        );
      }
    } else {
      panels = renderPanel();
    }

    const Button = (components?.button || 'button') as any;

    let mergedNodes: React.ReactNode = (
      <div className={`${prefixCls}-panel-layout`}>
        <PresetPanel
          prefixCls={prefixCls}
          presets={presetList}
          presetsHeader={presetsHeader}
          selectedValue={selectedValue}
          onClick={(nextValue) => {
            triggerChange(nextValue, null);
            triggerConfirm(nextValue);
            triggerOpen(false, mergedActivePickerIndex);
            if (mergedActivePickerIndex === 0) {
              setStartFocused(false);
            } else {
              setEndFocused(false);
            }
          }}
          onHover={(hoverValue) => {
            if (typeof hoverValue !== 'string') {
              setRangeHoverValue(hoverValue);
            }
          }}
        />
        <div>
          <div
            className={`${prefixCls}-panels`}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            {panels}
          </div>
          {picker === 'date' && showTime && (
            <>
              <DateRangeSelect<DateType>
                value={typeof selectedValue === 'string' ? null : selectedValue}
                generateConfig={generateConfig}
                locale={locale}
                open={mergedOpen}
                disabled={mergedDisabled}
                prefixCls={prefixCls}
                timeSelectProps={timeSelectProps}
                onTextChange={onTextChange}
                setActivePickerIndex={setMergedActivePickerIndex}
                onChange={(newValue, notNext) => {
                  triggerChange(newValue, mergedActivePickerIndex, notNext);
                }}
                components={components}
                showTime={showTime}
                use12Hours={use12Hours}
                onFocus={() => {
                  setInnerModes(updateValues(mergedModes, 'date', mergedActivePickerIndex));
                }}
              />
              <div className={`${prefixCls}-operation`}>
                <Button
                  className={`${prefixCls}-confirm-btn`}
                  onClick={() => {
                    triggerConfirm(selectedValue);
                    if (mergedActivePickerIndex === 0) {
                      startInputRef?.current?.focus();
                    }

                    if (mergedActivePickerIndex === 1) {
                      endInputRef?.current?.focus();
                    }
                  }}
                  disabled={!selectedValue?.[0] || !selectedValue?.[1]}
                >
                  {locale.ok}
                </Button>
              </div>
            </>
          )}
          {(extraNode || rangesNode) && (
            <div className={`${prefixCls}-footer`}>
              {extraNode}
              {rangesNode}
            </div>
          )}
        </div>
      </div>
    );

    if (panelRender) {
      mergedNodes = panelRender(mergedNodes);
    }

    return (
      <div
        className={`${prefixCls}-panel-container`}
        style={{ marginLeft: panelLeft }}
        ref={panelDivRef}
      >
        {mergedNodes}
      </div>
    );
  }

  const rangePanel = (
    <div
      className={classNames(`${prefixCls}-range-wrapper`, `${prefixCls}-${picker}-range-wrapper`)}
      style={{ minWidth: popupMinWidth }}
    >
      <div ref={arrowRef} className={`${prefixCls}-range-arrow`} style={arrowPositionStyle} />

      {renderPanels()}
    </div>
  );

  // ============================= Icons =============================
  let suffixNode: React.ReactNode;
  if (suffixIcon) {
    suffixNode = <span className={`${prefixCls}-suffix`}>{suffixIcon}</span>;
  }

  let prefixNode: React.ReactNode;
  if (prefixIcon) {
    prefixNode = (
      <span className={`${prefixCls}-prefix`} ref={prefixRef}>
        {prefixIcon}
      </span>
    );
  }

  let clearNode: React.ReactNode;
  if (
    allowClear &&
    ((typeof mergedValue !== 'string' && getValue(mergedValue, 0) && !mergedDisabled[0]) ||
      (typeof mergedValue !== 'string' && getValue(mergedValue, 1) && !mergedDisabled[1]) ||
      (typeof mergedValue === 'string' && !mergedDisabled[0] && !mergedDisabled[1]))
  ) {
    clearNode = (
      <span
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          let values = mergedValue;

          if (!mergedDisabled[0] && typeof values !== 'string') {
            values = updateValues(values, null, 0);
          }
          if (!mergedDisabled[1] && typeof values !== 'string') {
            values = updateValues(values, null, 1);
          }

          if (typeof values === 'string') {
            values = null;
          }

          triggerChange(values, mergedActivePickerIndex);
          triggerConfirm(values);
          triggerOpen(false, mergedActivePickerIndex);
        }}
        className={`${prefixCls}-clear`}
      >
        {clearIcon || <span className={`${prefixCls}-clear-btn`} />}
      </span>
    );
  }

  const inputSharedProps = {
    size: getInputSize(picker, formatList[0], generateConfig),
  };

  let activeBarLeft: number = 0;
  let activeBarWidth: number = 0;
  if (startInputDivRef.current && endInputDivRef.current && separatorRef.current) {
    if (mergedActivePickerIndex === 0) {
      activeBarLeft = arrowLeft;
      activeBarWidth = startInputDivRef.current.offsetWidth;
    } else {
      activeBarLeft = arrowLeft;
      activeBarWidth = endInputDivRef.current.offsetWidth;
    }
  }
  const activeBarPositionStyle =
    direction === 'rtl' ? { right: activeBarLeft } : { left: activeBarLeft };
  // ============================ Return =============================
  const onContextSelect = (date: DateType, type: 'key' | 'mouse' | 'submit') => {
    const values = updateValues(
      typeof selectedValue === 'string' ? null : selectedValue,
      date,
      mergedActivePickerIndex,
    );

    if (type === 'submit' || (type !== 'key' && !needConfirmButton)) {
      // triggerChange will also update selected values
      triggerChange(values, mergedActivePickerIndex);
      // clear hover value style
      if (mergedActivePickerIndex === 0) {
        onStartLeave();
      } else {
        onEndLeave();
      }
    } else {
      setSelectedValue(values);
    }
  };

  return (
    <PanelContext.Provider
      value={{
        operationRef,
        hideHeader: picker === 'time',
        onDateMouseEnter,
        onDateMouseLeave,
        hideRanges: true,
        onSelect: onContextSelect,
        open: mergedOpen,
      }}
    >
      <PickerTrigger
        visible={mergedOpen}
        popupElement={rangePanel}
        popupStyle={popupStyle}
        prefixCls={prefixCls}
        dropdownClassName={dropdownClassName}
        dropdownAlign={dropdownAlign}
        getPopupContainer={getPopupContainer}
        transitionName={transitionName}
        range
        direction={direction}
      >
        <div
          ref={containerRef}
          className={classNames(prefixCls, `${prefixCls}-range`, className, {
            [`${prefixCls}-disabled`]: mergedDisabled[0] && mergedDisabled[1],
            [`${prefixCls}-focused`]:
              (mergedActivePickerIndex === 0 ? startFocused : endFocused) || mergedOpen,
            [`${prefixCls}-rtl`]: direction === 'rtl',
          })}
          style={style}
          onClick={onPickerClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseDown={onPickerMouseDown}
          onMouseUp={onMouseUp}
          {...getDataOrAriaProps(props)}
        >
          {prefixNode}
          <div
            className={classNames(`${prefixCls}-input`, {
              [`${prefixCls}-input-active`]: mergedActivePickerIndex === 0,
              [`${prefixCls}-input-placeholder`]: !!startHoverValue,
            })}
            ref={startInputDivRef}
          >
            <input
              id={id}
              disabled={mergedDisabled[0]}
              readOnly={inputReadOnly || typeof formatList[0] === 'function' || !startTyping}
              value={startText}
              onChange={(e) => {
                triggerStartTextChange((e.target.value || '').replaceAll('：', ':'));
              }}
              autoFocus={autoFocus}
              placeholder={getValue(placeholder, 0) || ''}
              ref={startInputRef}
              {...startInputProps}
              {...inputSharedProps}
              autoComplete={autoComplete}
            />
          </div>
          {typeof selectedValue !== 'string' && (
            <>
              <div className={`${prefixCls}-range-separator`} ref={separatorRef}>
                {separator}
              </div>
              <div
                className={classNames(`${prefixCls}-input`, {
                  [`${prefixCls}-input-active`]: mergedActivePickerIndex === 1,
                  [`${prefixCls}-input-placeholder`]: !!endHoverValue,
                })}
                ref={endInputDivRef}
              >
                <input
                  disabled={mergedDisabled[1]}
                  readOnly={inputReadOnly || typeof formatList[0] === 'function' || !endTyping}
                  value={endText}
                  onChange={(e) => {
                    triggerEndTextChange((e.target.value || '').replaceAll('：', ':'));
                  }}
                  placeholder={getValue(placeholder, 1) || ''}
                  ref={endInputRef}
                  {...endInputProps}
                  {...inputSharedProps}
                  autoComplete={autoComplete}
                />
              </div>
              <div
                className={`${prefixCls}-active-bar`}
                style={{
                  ...activeBarPositionStyle,
                  width: activeBarWidth,
                  position: 'absolute',
                }}
              />
            </>
          )}
          {suffixNode}
          {clearNode}
        </div>
      </PickerTrigger>
    </PanelContext.Provider>
  );
}

// Wrap with class component to enable pass generic with instance method
class RangePicker<DateType> extends React.Component<RangePickerProps<DateType>> {
  pickerRef = React.createRef<PickerRefConfig>();

  focus = () => {
    if (this.pickerRef.current) {
      this.pickerRef.current.focus();
    }
  };

  blur = () => {
    if (this.pickerRef.current) {
      this.pickerRef.current.blur();
    }
  };

  render() {
    return (
      <InnerRangePicker<DateType>
        {...this.props}
        pickerRef={this.pickerRef as React.MutableRefObject<PickerRefConfig>}
      />
    );
  }
}

export default RangePicker;
