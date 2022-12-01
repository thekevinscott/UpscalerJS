import { ScriptableTooltipContext } from "chart.js";
import { useCallback, useState } from "react"
import { CHART_TYPE } from "../chart";

export interface TooltipOpts {
  opacity: number;
  top: number;
  left: number;
  label?: string;
  value?: string;
  index?: number;
}

export function useTooltip<T extends CHART_TYPE>(): [TooltipOpts, (context: ScriptableTooltipContext<T>) => void] {
  const [tooltip, setTooltip] = useState<TooltipOpts>({
    opacity: 0,
    top: 0,
    left: 0,
    label: undefined,
    value: undefined,
    index: undefined,
  });

  const tooltipCallback = useCallback((context) => {
    if (!('tooltip' in context)) {
      throw new Error('Invalid context provided');
    }
    const tooltipModel = context.tooltip;
    if (tooltipModel.opacity === 0) {
      setTooltip(prev => ({ ...prev, opacity: 0 }));
    } else {
      const position = context.chart.canvas.getBoundingClientRect();
      setTooltip({
        opacity: 1,
        left: position.left + tooltipModel.caretX + 10,
        top: position.top + tooltipModel.caretY,
        index: tooltipModel.dataPoints[0].dataIndex,
        label: tooltipModel.dataPoints[0].label,
        value: tooltipModel.dataPoints[0].formattedValue,
      });
    }
  }, []);

  return [
    tooltip,
    tooltipCallback,
  ];
}
