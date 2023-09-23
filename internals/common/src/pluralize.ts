export const EMPTY_ITEMS_ERROR = new Error('Must provide at least one item to pluralize')
export const DEFAULT_SEPARATOR = 'or';
export const pluralize = (items: string[], separator = DEFAULT_SEPARATOR): string => {
  if (items.length === 0) {
    throw EMPTY_ITEMS_ERROR;
  }
  if (items.length <= 2) {
    return items.join(` ${separator} `);
  }

  return `${items.slice(0, -1).join(', ')}, ${separator} ${items[items.length - 1]}`;
};

