import { useCallback, useEffect, useRef } from "react";

export type ShoelaceEventListenerCallback<T extends HTMLElement> = (target: T, e: Event) => void;

export function useShoelaceEventListener<T extends HTMLElement>(callback: ShoelaceEventListenerCallback<T>, ...eventNames: string[]) {
  const ref = useRef<T>();

  const handleEvent = useCallback((e) => {
    const target = e.target as T;
    if (callback) {
      callback(target, e);
    } else {
      // console.warn('No callback defined for event', e);
    }
  }, [callback, JSON.stringify(eventNames)]);

  useEffect(() => {
    const c = ref.current;
    if (c) {
      eventNames.forEach(eventName => {
        c.addEventListener(eventName, handleEvent);
        return () => {
          c.removeEventListener(eventName, handleEvent);
        }
      });
    }
  }, [handleEvent, ref]);

  return ref;
}

