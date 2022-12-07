import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useShoelaceEventListener } from '@site/src/hooks/useShoelaceEventListener';
import styles from './dropdown-menu.module.scss';
import { SlMenuItem } from '@shoelace-style/shoelace';
import SlDropdown from '@shoelace-style/shoelace/dist/react/dropdown';
import SlMenu from '@shoelace-style/shoelace/dist/react/menu';
import { Button } from '@site/src/components/button/button';

interface IProps <T> {
  defaultValue?: T[];
  onChange?: (value: T[]) => void;
  multi?: boolean;
  children?: JSX.Element | JSX.Element[];
  allLabel?: string;
  placement?: React.ComponentProps<typeof SlDropdown>['placement'];
  title?: string;
}

const getPlural = (value: Set<string>) => {
  const values = Array.from(value);

  if (values.length <= 2) {
    return values.join(' and ');
  }

  return [
    [...values.slice(0, -1), ''].join(', '),
    values[values.length - 1],
  ].filter(Boolean).join(' and ');
};

export function DropdownMenu<T extends string>({title, placement = 'bottom-start', allLabel, children, multi = false, defaultValue, onChange, ...props }: IProps<T>) {
  const [value, _setValue] = useState<Set<T>>(new Set());

  const setValue = useCallback((_value: T, toggle = false) => {
    if (!_value) {
      return;
    }
    if (multi) {
      _setValue(prev => {
        if (toggle) {
          if (prev.has(_value)) {
            if (prev.size > 1) {
              prev.delete(_value);
            }
          } else {
            prev.add(_value);
          }
        } else {
          prev.add(_value);
        }
        return new Set(prev);
      });
    } else {
      _setValue(new Set([_value]));
    }
  }, [multi]);

  useEffect(() => {
    if (defaultValue) {
      defaultValue.forEach(v => setValue(v));
    }
  }, []);

  const ref = useShoelaceEventListener<SlMenuItem>(el => setValue(el.value as T, true), 'click', 'touch');
  const label = useMemo(() => {
    if (value.size === 0) {
      return defaultValue;
    }

    if (allLabel && value.size === defaultValue.length) {
      return allLabel;
    }

    return getPlural(value);
  }, [allLabel, value, defaultValue]);

  useEffect(() => {
    if (onChange) {
      onChange(Array.from(value));
    }
  }, [value, onChange]);

  return (
    <div>
      {title && <label className={styles.title}>{title}</label>}
      <SlDropdown
        stayOpenOnSelect
        placement={placement}
        distance={20}
        {...props}
      >
        <Button slot="trigger" caret>
          {label}
        </Button>
        <SlMenu ref={ref}>
          {children}
        </SlMenu>
      </SlDropdown>
    </div>
  );
}
