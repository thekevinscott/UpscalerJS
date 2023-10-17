import { Application, ProjectReflection, TSConfigReader, TypeDocReader } from "typedoc";

export const getPackageAsTree = (entryPoint: string, tsconfig: string, projectRoot: string): ProjectReflection => {
  const app = new Application();

  app.options.addReader(new TSConfigReader());
  app.options.addReader(new TypeDocReader());

  app.bootstrap({
    entryPoints: [entryPoint],
    tsconfig,
  });

  const project = app.convert();

  if (!project) {
    throw new Error('No project was converted.')
  }
  return app.serializer.projectToObject(project, projectRoot) as unknown as ProjectReflection;
};
