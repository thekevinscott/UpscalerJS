import Upscaler from 'upscaler';
import flower from '../flower-small.png';
const upscaler = new Upscaler();
upscaler.upscale(flower).then(console.log);
