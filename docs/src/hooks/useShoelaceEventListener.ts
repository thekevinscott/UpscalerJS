import { useCallback, useEffect, useRef } from "react";

export type ShoelaceEventListenerCallback<T extends HTMLElement> = (target: T, e: Event) => void;

export function useShoelaceEventListener<T extends HTMLElement>(callback: ShoelaceEventListenerCallback<T>, ...eventNames: string[]) {
  const ref = useRef<T>();

  const handleEvent = useCallback((e) => {
    const target = e.target as T;
    if (callback) {
      callback(target, e);
    }
  }, [callback, JSON.stringify(eventNames)]);

  useEffect(() => {
    const current = ref.current;
    if (current) {
      eventNames.forEach(eventName => {
        current.addEventListener(eventName, handleEvent);
      });
      return () => {
        eventNames.forEach(eventName => {
          current.removeEventListener(eventName, handleEvent);
        });
      }
    }
  }, [handleEvent, ref]);

  return ref;
}

