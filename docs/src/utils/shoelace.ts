import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
const shoelace: any = {};

if (typeof window !== "undefined") {
  const { setBasePath } = require("@shoelace-style/shoelace");
  setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.0.0-beta.80/dist/');
  shoelace.setBasePath = setBasePath;
}

export default shoelace;
