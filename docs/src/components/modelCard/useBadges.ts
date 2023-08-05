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

function useFetch<T>(url: string): T | undefined {
  const [result, setResult] = useState<T>();

  useEffect(() => {
    fetch(url).then(r => r.json()).then(setResult);
  }, [url])

  return result;
};

const useRegistry = (packageName: string) => useFetch<RegistryResponse>(`https://registry.npmjs.org/@upscalerjs/${packageName}`);
const useDownloadCount = (packageName: string) => useFetch<DownloadCountResponse>(`https://api.npmjs.org/downloads/point/last-week/@upscalerjs/${packageName}`);

export const useBadges = (packageName: string): {
  version: undefined | string;
  lastUpdated: undefined | Date;
  minifiedSize: undefined | number;
  downloadsPerWeek: undefined | number;
} => {
  const {
    'dist-tags': distTags,
    time,
  } = useRegistry(packageName) || {};
  const { downloads: downloadsPerWeek } = useDownloadCount(packageName) || {};

  return useMemo(() => ({
    version: distTags?.latest,
    lastUpdated: time?.modified ? new Date(time.modified) : undefined, 
    minifiedSize: undefined,
    downloadsPerWeek,
  }), [distTags, time, downloadsPerWeek]);
  // version
  // last updated
  // minified size
  // downloads per week
};

