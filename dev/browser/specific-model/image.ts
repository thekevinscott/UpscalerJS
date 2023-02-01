export const makeImg = (path: string, label: string) => {
  const img = new Image();
  img.src = path;
  img.onload = () => {
    const divEl = document.createElement('div');
    const imgEl = document.createElement('img');
    const labelEl = document.createElement('label');
    labelEl.innerText = label;
    imgEl.src = path;
    imgEl.width = img.width;
    imgEl.height = img.height;
    imgEl.appendChild(img);

    divEl.appendChild(labelEl);
    divEl.appendChild(imgEl);
    divEl.appendChild(document.createElement('hr'));

    document.body.appendChild(divEl);
    return imgEl;
  }
}
