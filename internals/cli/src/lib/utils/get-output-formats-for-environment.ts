import { Environment, OutputFormat } from "@internals/common/types";

export const getOutputFormatsForEnvironment = (environment: Environment): OutputFormat[] => environment === 'serverside' ? ['cjs'] : ['esm', 'umd'];
