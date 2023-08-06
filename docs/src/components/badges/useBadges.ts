import { useEffect, useMemo, useState } from "react";

interface RegistryResponse {
  author: {
    name: string;
  };
  description: string;
  'dist-tags': {
    latest: string;
  };
  keywords: string[];
  license: string;
  maintainers: { name: string; email: string; }[];
  name: string;
  readme: string;
  readmeFilename: string;
  time: Record<string, string>;
  // versions is not exactly correct but it's good enough for now
  versions: Record<string, RegistryResponse>; 
};

interface DownloadCountResponse {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

interface JSDelivrAPIResponseRanking {
  rank: number;
  typeRank: number;
  total: number;
  dates: Record<string, number>;
  prev: {
    rank: number;
    typeRank: number;
    total: number;
  };
};

interface JSDelivrAPIResponse {
  hits: JSDelivrAPIResponseRanking;
  bandwidth: JSDelivrAPIResponseRanking;
  links: {
    self: string;
    version: string;
  };
}

function useFetch<T>(url: string): T | undefined {
  const [result, setResult] = useState<T>();

  useEffect(() => {
    fetch(url).then(r => r.json()).then(setResult);
  }, [url])

  return result;
};

const useRegistry = (packageName: string) => useFetch<RegistryResponse>(`https://registry.npmjs.org/@upscalerjs/${packageName}`);
const useDownloadCount = (packageName: string) => useFetch<DownloadCountResponse>(`https://api.npmjs.org/downloads/point/last-week/@upscalerjs/${packageName}`);
const useHitCount = (packageName: string) => useFetch<JSDelivrAPIResponse>(`https://data.jsdelivr.com/v1/stats/packages/npm/@upscalerjs/${packageName}?period=week`);

export const useBadges = (packageName: string): {
  version: undefined | string;
  lastUpdated: undefined | Date;
  minifiedSize: undefined | number;
  downloadsPerWeek: undefined | number;
  cdnHits: undefined | number;
} => {
  const {
    'dist-tags': distTags,
    time,
  } = useRegistry(packageName) || {};
  const { downloads: downloadsPerWeek } = useDownloadCount(packageName) || {};
  const { hits } = useHitCount(packageName) || {};

  return useMemo(() => ({
    version: distTags?.latest,
    lastUpdated: time?.modified ? new Date(time.modified) : undefined, 
    minifiedSize: undefined,
    downloadsPerWeek,
    cdnHits: hits?.total,
  }), [distTags, time, downloadsPerWeek]);
};

