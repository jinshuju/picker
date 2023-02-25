import classNames from 'classnames';
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
  className?: string;
  units: Unit[];
  value?: number;
  active?: boolean;
  disabled?: boolean;
  onChange?: (value: number) => void;
  onFocus?: React.FocusEventHandler<HTMLElement>;
};

function TimeUnitSelect(props: TimeUnitSelectProps) {
  const { prefixCls, units, onChange, onFocus, disabled, className, value } = props;

  const selectPrefixCls = `${prefixCls}-select`;
  const selectRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={selectRef}
      className={classNames(`${selectPrefixCls}-wrapper`, className)}
      style={{ position: 'relative' }}
    >
      <Select
        prefixCls={selectPrefixCls}
        getPopupContainer={() => selectRef.current}
        value={value}
        showSearch
        disabled={disabled}
        onChange={onChange}
        onFocus={onFocus}
      >
        {units!.map((unit) => {
          return (
            <Option
              className={`${selectPrefixCls}-option`}
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
