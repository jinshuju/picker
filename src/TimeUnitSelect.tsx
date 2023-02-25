import Select, { Option } from 'rc-select';
import * as React from 'react';
import { useRef } from 'react';

export type Unit = {
  label: React.ReactText;
  value: number;
  disabled: boolean;
};

export type TimeUnitSelectProps = {
  prefixCls?: string;
  units: Unit[];
  value?: number;
  active?: boolean;
  onChange?: (value: number) => void;
  onFocus?: React.FocusEventHandler<HTMLElement>;
};

function TimeUnitSelect(props: TimeUnitSelectProps) {
  const { prefixCls, units, onChange, onFocus, value } = props;

  const optionPrefixCls = `${prefixCls}-option`;
  const selectRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={selectRef} style={{ position: 'relative' }}>
      <Select
        getPopupContainer={() => selectRef.current}
        value={value}
        showSearch
        onChange={onChange}
        onFocus={onFocus}
      >
        {units!.map((unit) => {
          return (
            <Option
              className={optionPrefixCls}
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
