import getModelDefinition from '../../utils/getModelDefinition';
const smallX2BestValGeneratorLossEpoch500 = getModelDefinition(2, 'rdn', 'models/rdn-C1-D2-G4-G064-T10-x2-patchsize128-compress100-sharpen0-datadiv2k-vary_cFalse/2022-06-09_1058/rdn-C1-D2-G4-G064-T10-x2-patchsize128-compress100-sharpen0-datadiv2k-vary_cFalse_best-val_generator_loss_epoch500.h5/rdn-C1-D2-G4-G064-T10-x2-patchsize128-compress100-sharpen0-datadiv2k-vary_cFalse_best-val_generator_loss_epoch500/model.json', {
  "scale": 2,
  "architecture": "rdn",
  "C": 1,
  "D": 2,
  "G": 4,
  "G0": 64,
  "T": 10,
  "patchSize": 128,
  "compress": 100,
  "sharpen": 0,
  "dataset": "div2k",
  "varyCompression": "False",
  "size": "small",
});
export default smallX2BestValGeneratorLossEpoch500;