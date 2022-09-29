import getModelDefinition from '../../utils/getModelDefinition';
const mediumX2BestValGeneratorLossEpoch500 = getModelDefinition(2, 'rdn', 'models/rdn-C1-D10-G64-G064-T10-x2-patchsize128-compress100-sharpen0-datadiv2k-vary_cFalse/2022-06-12_0727/rdn-C1-D10-G64-G064-T10-x2-patchsize128-compress100-sharpen0-datadiv2k-vary_cFalse_best-val_generator_loss_epoch500.h5/rdn-C1-D10-G64-G064-T10-x2-patchsize128-compress100-sharpen0-datadiv2k-vary_cFalse_best-val_generator_loss_epoch500/model.json', {
  "scale": 2,
  "architecture": "rdn",
  "C": 1,
  "D": 10,
  "G": 64,
  "G0": 64,
  "T": 10,
  "patchSize": 128,
  "compress": 100,
  "sharpen": 0,
  "dataset": "div2k",
  "varyCompression": "False",
  "size": "medium",
});
export default mediumX2BestValGeneratorLossEpoch500;