import callExec from "../../../test/lib/utils/callExec";

interface Volume {
  external: string;
  internal: string;

}
interface DockerOptions {
  volumes?: Volume[];
}
type RunDocker = (dockerImage: string, cmd: string, opts?: DockerOptions) => Promise<void>;
export const runDocker: RunDocker = (dockerImage, cmd, { volumes = [] } = {}) => {
  return callExec([
    "docker run --rm",
    ...volumes.map(({ internal, external }) => {
      return `-v "${external}:${internal}"`;
    }),
    dockerImage,
    cmd,
  ].join(' '));
}
