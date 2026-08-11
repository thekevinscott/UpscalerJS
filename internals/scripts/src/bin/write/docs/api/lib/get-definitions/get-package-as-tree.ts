import { Application, normalizePath, ProjectReflection, TSConfigReader, TypeDocReader } from "typedoc";

export const getPackageAsTree = async (entryPoint: string, tsconfig: string, projectRoot: string): Promise<ProjectReflection> => {
  const app = await Application.bootstrap({
    entryPoints: [entryPoint],
    tsconfig,
  }, [
    new TSConfigReader(),
    new TypeDocReader(),
  ]);

  const project = await app.convert();

  if (!project) {
    throw new Error('No project was converted.')
  }
  return app.serializer.projectToObject(project, normalizePath(projectRoot)) as unknown as ProjectReflection;
};
