// import Upscaler from 'upscaler';
// import img from './flower.png';
// const target = document.getElementById('target');
// const button = document.getElementById('button');
// const info = document.getElementById('info');

// const upscaler = new Upscaler({
//   model: 'div2k/rdn-C3-D10-G64-G064-x2',
// });
// button.onclick = () => {
//   info.innerText = 'Upscaling...';
//   const start = new Date().getTime();
//   upscaler.upscale(img).then((upscaledImgSrc) => {
//     const img = document.createElement('img');
//     img.src = upscaledImgSrc;
//     target.innerHTML = '';
//     target.appendChild(img);
//     const ms = new Date().getTime() - start;
//     info.innerText = `Upscaled in ${ms} ms`;
//   });
// };


const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("hello");
});

app.listen(8080);
