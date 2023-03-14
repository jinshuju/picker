import classNames from 'classnames';
import * as React from 'react';
import type { PresetDate } from './interface';

export interface PresetPanelProps<T> {
  prefixCls: string;
  presets: PresetDate<T>[];
  onClick: (value: T) => void;
  onHover?: (value: T) => void;
  selectedValue?: T;
  presetsHeader?: React.ReactNode;
}

export default function PresetPanel<T>(props: PresetPanelProps<T>) {
  const { prefixCls, presets, presetsHeader, onClick, onHover, selectedValue } = props;

  if (!presets.length) {
    return null;
  }

  return (
    <div className={`${prefixCls}-presets`}>
      {presetsHeader}
      <ul>
        {presets.map(({ label, value }, index) => (
          <li
            key={index}
            className={classNames({
              [`${prefixCls}-preset-active`]: !!selectedValue && selectedValue === value,
            })}
            onClick={() => {
              onClick(value);
            }}
            onMouseEnter={() => {
              onHover?.(value);
            }}
            onMouseLeave={() => {
              onHover?.(null);
            }}
          >
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
