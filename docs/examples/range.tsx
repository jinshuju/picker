import type { Moment } from 'moment';
import moment from 'moment';
import React from 'react';
import '../../assets/index.less';
import momentGenerateConfig from '../../src/generate/moment';
import zhCN from '../../src/locale/zh_CN';
import RangePicker from '../../src/RangePicker';
import './common.less';

const defaultStartValue = moment('2019-09-03 05:02:03');
const defaultEndValue = moment('2023-08-03 02:12:06');

function formatDate(date: Moment | null) {
  return date ? date.format('YYYY-MM-DD HH:mm:ss') : 'null';
}

export default () => {
  const [value, setValue] = React.useState<[Moment | null, Moment | null] | null>([
    defaultStartValue,
    defaultEndValue,
  ]);

  const onChange = (newValue: [Moment | null, Moment | null] | null, formatStrings?: string[]) => {
    console.log('Change:', newValue, formatStrings);
    setValue(newValue);
  };

  const onCalendarChange = (
    newValue: [Moment | null, Moment | null] | null,
    formatStrings?: string[],
  ) => {
    console.log('Calendar Change:', newValue, formatStrings);
  };

  const sharedProps = {
    generateConfig: momentGenerateConfig,
    value,
    onChange,
    onCalendarChange,
  };

  const rangePickerRef = React.useRef<RangePicker<Moment>>(null);

  const now = momentGenerateConfig.getNow();
  const disabledDate = (current: Moment) => {
    return current.diff(now, 'days') > 1 || current.diff(now, 'days') < -1;
  };

  return (
    <div>
      <h2>Value: {value ? `${formatDate(value[0])} ~ ${formatDate(value[1])}` : 'null'}</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <div style={{ margin: '0 8px' }}>
          <h3>Basic</h3>
          <RangePicker<Moment>
            {...sharedProps}
            value={undefined}
            locale={zhCN}
            allowClear
            ref={rangePickerRef}
            defaultValue={[moment('1990-09-03'), moment('1989-11-28')]}
            clearIcon={<span>X</span>}
            suffixIcon={<span>O</span>}
            prefixIcon={<span>D</span>}
          />
          <div />
          <RangePicker<Moment>
            {...sharedProps}
            locale={zhCN}
            allowClear
            ref={rangePickerRef}
            showTime={{
              showSecond: true,
              defaultValue: [moment('00:00:00', 'HH:mm:ss'), moment('23:59:59', 'HH:mm:ss')],
            }}
            style={{ width: 580 }}
            ranges={{
              ranges: [moment(), moment().add(10, 'day')],
            }}
            presetsHeader={<div>快速查看</div>}
            onOk={(dates) => {
              console.log('OK!!!', dates);
            }}
          />
          <div />
          <RangePicker<Moment>
            {...sharedProps}
            locale={zhCN}
            allowClear
            ref={rangePickerRef}
            showTime
            style={{ width: 580 }}
            ranges={{
              ranges: [moment(), moment().add(10, 'day')],
            }}
            format="YYYY-MM-DD HH:mm"
            presetsHeader={<div>快速查看</div>}
            onOk={(dates) => {
              console.log('OK!!!', dates);
            }}
          />
          <div />
          <RangePicker<Moment>
            {...sharedProps}
            value={undefined}
            locale={zhCN}
            allowClear
            picker="time"
            ranges={{
              test: [moment(), moment().add(1, 'hour')],
            }}
          />
          <div />
          <RangePicker<Moment>
            {...sharedProps}
            value={undefined}
            locale={zhCN}
            allowClear
            picker="time"
            style={{ width: 280 }}
          />
        </div>

        <div style={{ margin: '0 8px' }}>
          <h3>Focus</h3>
          <RangePicker<Moment>
            {...sharedProps}
            locale={zhCN}
            allowClear
            ref={rangePickerRef}
            // style={{ width: 500 }}
          />
          <button
            type="button"
            onClick={() => {
              rangePickerRef.current!.focus();
            }}
          >
            Focus!
          </button>
        </div>

        <div style={{ margin: '0 8px' }}>
          <h3>Year</h3>
          <RangePicker<Moment> {...sharedProps} locale={zhCN} picker="year" />
        </div>

        <div style={{ margin: '0 8px' }}>
          <h3>Quarter</h3>
          <RangePicker<Moment> {...sharedProps} locale={zhCN} picker="quarter" />
        </div>

        <div style={{ margin: '0 8px' }}>
          <h3>Month</h3>
          <RangePicker<Moment> {...sharedProps} locale={zhCN} picker="month" />
        </div>

        <div style={{ margin: '0 8px' }}>
          <h3>Week</h3>
          <RangePicker<Moment> {...sharedProps} locale={zhCN} picker="week" />
        </div>

        <div style={{ margin: '0 8px' }}>
          <h3>Allow Empty</h3>
          <RangePicker<Moment>
            {...sharedProps}
            locale={zhCN}
            allowClear
            allowEmpty={[true, true]}
          />
        </div>

        <div style={{ margin: '0 8px' }}>
          <h3>Start disabled</h3>
          <RangePicker<Moment> {...sharedProps} locale={zhCN} allowClear disabled={[true, false]} />
        </div>
        <div style={{ margin: '0 8px' }}>
          <h3>End disabled</h3>
          <RangePicker<Moment> {...sharedProps} locale={zhCN} allowClear disabled={[false, true]} />
        </div>

        <div style={{ margin: '0 8px' }}>
          <h3>Uncontrolled</h3>
          <RangePicker<Moment>
            {...sharedProps}
            value={undefined}
            locale={zhCN}
            placeholder={['start...', 'end...']}
            disabled={[false, true]}
            allowEmpty={[false, true]}
            renderExtraFooter={() => <div>extra footer</div>}
          />
        </div>
        <div style={{ margin: '0 8px' }}>
          <h3>Uncontrolled2</h3>
          <RangePicker<Moment>
            {...sharedProps}
            value={undefined}
            locale={zhCN}
            placeholder={['start...', 'end...']}
          />
        </div>
        <div style={{ margin: '0 8px' }}>
          <h3>DisabledDate</h3>
          <RangePicker<Moment>
            {...sharedProps}
            value={undefined}
            locale={zhCN}
            placeholder={['start...', 'end...']}
            disabledDate={disabledDate}
          />
        </div>
      </div>
    </div>
  );
};
