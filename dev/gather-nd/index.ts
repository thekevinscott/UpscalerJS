import * as tf from '@tensorflow/tfjs';
const canvas = document.createElement('canvas');
canvas.width = 8;
canvas.height = 8;
canvas.style.width = `${canvas.width}px`;
canvas.style.height = `${canvas.height}px`;
canvas.style.border = "1px solid black";
canvas.style.margin = "20px";
document.body.appendChild(canvas);

const zeros = tf.zeros([canvas.height, canvas.width, 3], 'int32') as tf.Tensor3D;
const ones = tf.ones([Math.floor(canvas.height * .5), Math.floor(canvas.width * .5), 3], 'int32') as tf.Tensor3D;

tf.browser.toPixels(zeros, canvas);

// const indices = tf.tensor3d([[[0, 0, 0], [1, 1, 1], [1, 1, 1]]], [1,3,3], 'int32');
tf.add(zeros, ones).print() // [10, 11]
