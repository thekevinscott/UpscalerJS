import levenshtein from 'fast-levenshtein';

/**
 * For a particular query (e.g., one that is misspelled), 
 * find similar files in a directory
 */
export const findSimilarFiles = async (
  files: string[],
  query: string, 
  {
    n,
    distance: threshold,
  }: {
    n?: number, 
    distance?: number,
  }
): Promise<string[]> => {
  const filesWithDistance = files.reduce<{ file: string; distance: number; }[]>((arr, file) => {
    const distance = levenshtein.get(query, file);
    if (threshold === undefined || distance < threshold) {
      return arr.concat({
        file,
        distance,
      });
    }

    return arr;
  }, []);

  const sortedFiles = filesWithDistance.sort((a, b) => {
    return a.distance - b.distance;
  });

  return sortedFiles.slice(0, n).map(({ file }) => file);
};
