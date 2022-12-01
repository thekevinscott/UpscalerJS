import type { Meta } from '@upscalerjs/core';
import { arrayQuery, useDatabase } from "@site/src/utils/sqljs";
import { useCallback, useEffect, useState } from "react";
import { OnChangeOpts } from "../modelFilter/modelFilter";
import { Device } from "./utils";

const SIZE = 64;

export interface SpeedResult {
  value: number;
  times: number;

  device: {
    id: number;
    os?: string;
    osVersion?: string;
    browserName?: string;
    browserVersion?: string;
    device?: string;
  }
  model: {
    id: number;
    name: string;
    package: string;
    packageId: number;
    scale: number;
    meta: Meta;
  }
}

const SPEED_QUERY = `
  SELECT 
  r.value, 
  r.times,
  r.size,

  d.id as deviceId,
  d.os,
  d.os_version,
  d.browserName,
  d.browser_version,
  d.device,

  m.id as modelId,
  m.meta,
  m.name,
  m.scale,
  p.id as packageId,
  p.name as package
  FROM results r
  LEFT JOIN devices d ON r.deviceId = d.id
  LEFT JOIN models m ON r.modelId = m.id
  LEFT JOIN packages p ON m.packageId = p.id
  WHERE 1=1
`;

export const useSpeedQuery = (databasePath: string, opts: {
  devices: Device[];
  activeModel: OnChangeOpts;
}, {
  packageName,
}: {
  packageName?: string;
}) => {
  const {
    devices,
    activeModel,
  } = opts;

  const { query } = useDatabase(databasePath);

  const getSpeedResults = useCallback(async (): Promise<SpeedResult[]> => {
    const packages = (packageName ? [packageName] : activeModel?.packages) || [];
    const hasActivePackages = packages.length > 0;
    const rows = await query<{
      meta: string;
      name: string;
      package: string;
      packageId: number;
      modelId: number;
      scale: number;

      value: number;
      times: number;
      size: number;

      deviceId: number;
      os?: string;
      os_version?: string;
      browserName?: string;
      browser_version?: string;
      device?: string;
    }>(`${SPEED_QUERY}
      AND r.size = ?
      AND d.device IN ${arrayQuery(devices)}
      ${activeModel?.scales ? `AND scale IN ${arrayQuery(activeModel.scales)}` : ''}
      ${hasActivePackages ? `AND p.name IN ${arrayQuery(packages)}` : ''}
    `, [
      SIZE,
      ...devices,
      ...(activeModel?.scales || []),
      ...(hasActivePackages ? packages : []),
    ]);
    return rows.map(({ modelId: id, packageId, name, package: _packageName, scale, meta, os, os_version, browserName, browser_version, device, deviceId, ...row }) => {
      return {
        ...row,
        device: {
          id: deviceId,
          os, os_version, browserName, browser_version, device,
        },
        model: {
          id,
          packageId,
          name,
          package: _packageName,
          scale,
          meta: JSON.parse(meta),
        },
      };
    });
  }, [query, JSON.stringify(opts), packageName]);

  const [data, setData] = useState<SpeedResult[]>([]);
  useEffect(() => {
    getSpeedResults().then(setData);
  }, [getSpeedResults, JSON.stringify(opts)]);

  return data;
}

