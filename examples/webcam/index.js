import Upscaler from "upscaler";
const target = document.getElementById("target");
const info = document.getElementById("info");
const video = document.getElementById("video");
const button = document.getElementById("button");
const canvas = document.createElement("canvas");
canvas.width = video.width;
canvas.height = video.height;

const upscaler = new Upscaler();

navigator.mediaDevices
  .getUserMedia({ audio: false, video: true })
  .then(stream => {
    video.srcObject = stream;
    button.disabled = false;

    button.onclick = () => {
      const context = canvas.getContext("2d");
      context.fillStyle = "#AAA";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const data = canvas.toDataURL("image/png");
      info.innerText = "Upscaling...";
      const start = new Date().getTime();
      upscaler.upscale(data, {
        patchSize: 16,
        padding: 4,
      }).then(upscaledImgSrc => {
        const img = document.createElement("img");
        img.src = upscaledImgSrc;
        target.innerHTML = "";
        target.appendChild(img);
        const ms = new Date().getTime() - start;
        info.innerText = `Upscaled in ${ms} ms`;
      });
    };
  });
