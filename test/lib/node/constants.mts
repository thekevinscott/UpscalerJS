export const LOCAL_UPSCALER_NAME = 'upscaler-for-node';
// we need to copy the upscaler into the local folder so that it references the correct tfjs installation

// TODO: We can't easily change this name, as models have a constants file generated
// by the package json, so even copying the module over and modifying the package json
// file won't work; we'd need to rebuild the module, which we can't do from outside the repo.
export const LOCAL_UPSCALER_NAMESPACE = '@upscalerjs';
