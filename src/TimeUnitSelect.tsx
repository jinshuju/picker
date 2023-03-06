import classNames from 'classnames';
import type { SelectProps } from 'rc-select';
import Select, { Option } from 'rc-select';
import * as React from 'react';
import { useRef } from 'react';

export type Unit = {
  label: React.ReactText;
  value: number;
  disabled: boolean;
};

export type TimeUnitSelectProps = {
  prefixCls: string;
  timeSelectProps?: SelectProps;
  className?: string;
  units: Unit[];
  value?: number;
  active?: boolean;
  disabled?: boolean;
  onChange?: (value: number) => void;
  onFocus?: React.FocusEventHandler<HTMLElement>;
};

function TimeUnitSelect(props: TimeUnitSelectProps) {
  const { prefixCls, timeSelectProps, units, onChange, onFocus, disabled, className, value } =
    props;

  const selectRef = useRef<HTMLDivElement>(null);
  const selectPrefixCls = timeSelectProps?.prefixCls ?? 'rc-select';

  return (
    <div
      ref={selectRef}
      className={classNames(`${prefixCls}-select-wrapper`, className)}
      style={{ position: 'relative' }}
    >
      <Select
        className={`${prefixCls}-select`}
        showArrow
        showSearch
        {...timeSelectProps}
        prefixCls={selectPrefixCls}
        getPopupContainer={() => selectRef.current}
        value={value}
        disabled={disabled}
        onChange={onChange}
        onFocus={onFocus}
      >
        {units!.map((unit) => {
          return (
            <Option
              className={`${prefixCls}-select-option`}
              disabled={unit.disabled}
              key={unit.value}
              value={unit.value}
            >
              {unit.label}
            </Option>
          );
        })}
      </Select>
    </div>
  );
}

export default TimeUnitSelect;
