import { useCallback, useEffect, useReducer, useRef } from 'react';

export type IState = {
  total?: number;
  idx: number;
  animating: boolean;
};

const initialState: IState = {
  total: undefined,
  idx: 0,
  animating: true,
}

// get a psuedo-random key to check if the current function is still active
const getRandomKey = () => [new Date().getTime(),Math.random()].join('-');

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const useKeys = () => {
  const currentKey = useRef<{key: string | undefined}>({ key: undefined });
  const resetKey = useCallback(() => {
    const key = getRandomKey();
    currentKey.current = { key };
    return key;
  }, []);
  const isValidKey = useCallback((key: string) => {
    const isValid = currentKey.current !== undefined && key === currentKey.current.key;
    return isValid;
  }, []);
  return {currentKey, resetKey, isValidKey};
};

type Action = 
| { type: 'reset', total: number}
| { type: 'setAnimating', animating: boolean }
| { type: 'setImage', activeIdx: number}
| { type: 'nextStep' }

const reducer = (state: IState, action: Action): IState => {
  if (action.type === 'reset') {
    return {
      ...state,
      idx: 0,
      total: action.total,
      animating: true,
    }
  }

  if (action.type === 'setAnimating') {
    return {
      ...state,
      animating: action.animating,
    }
  }

  if (action.type === 'nextStep') {
    return {
      ...state,
      idx: state.idx + 1,
    }
  }

  if (action.type === 'setImage') {
    return {
      ...state,
      animating: false,
      idx: state.total * action.activeIdx + 4,
    }
  }

  return state;
};

const useTrackAnimationState = (steps: number) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'reset', total: steps });
  }, [steps]);

  return {state, dispatch};
};

export const useAnimation = (durations: number[]) => {
  const { resetKey, isValidKey} = useKeys();
  const {state, dispatch} = useTrackAnimationState(durations.length);
  const { animating, idx } = state;
  const stepIdx = idx % durations.length;
  const timer = useRef<number>();

  const moveNext = useCallback(async (stepIdx: number) => {
    const key = resetKey();
    const dur = durations[stepIdx];
    if (dur === 0 || dur === undefined) {
      throw new Error(`Bad duration for steps ${JSON.stringify(durations)}`);
    }
    try {
      if (!animating || !isValidKey(key)) { throw new Error(); }
      await wait(dur);
      if (!animating || !isValidKey(key)) { throw new Error(); }
      dispatch({
        type: 'nextStep',
      });
    } catch(err) {}
  }, [durations]);

  useEffect(() => {
    if (animating) {
      moveNext(stepIdx);
    }
  }, [animating, idx]);

  const stopAnimating = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    resetKey();
  }, []);

  const handleMouseOut = useCallback((_i: number) => {}, []);

  const handleMouseOver = useCallback((_i: number) => {}, []);

  const handleClick = useCallback((i: number) => {
    stopAnimating();
    dispatch({
      type: 'setImage',
      activeIdx: i,
    });
    timer.current = window.setTimeout(() => {
      dispatch({
        type: 'setAnimating',
        animating: true,
      });
    }, 5000);
    return () => {
      clearTimeout(timer.current);
    }
  }, []);

  return {
    animating,
    handleMouseOut,
    handleMouseOver,
    handleClick,
    idx: state.idx,
  };
}
