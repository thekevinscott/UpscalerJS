"use strict";(self.webpackChunk_upscalerjs_docs=self.webpackChunk_upscalerjs_docs||[]).push([[1794],{54852:(e,t,a)=>{a.d(t,{Zo:()=>c,kt:()=>m});var n=a(49231);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function l(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function i(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?l(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):l(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function o(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},l=Object.keys(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var s=n.createContext({}),p=function(e){var t=n.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):i(i({},t),e)),a},c=function(e){var t=p(e.components);return n.createElement(s.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},d=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,l=e.originalType,s=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),d=p(a),m=r,g=d["".concat(s,".").concat(m)]||d[m]||u[m]||l;return a?n.createElement(g,i(i({ref:t},c),{},{components:a})):n.createElement(g,i({ref:t},c))}));function m(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var l=a.length,i=new Array(l);i[0]=d;var o={};for(var s in t)hasOwnProperty.call(t,s)&&(o[s]=t[s]);o.originalType=e,o.mdxType="string"==typeof e?e:r,i[1]=o;for(var p=2;p<l;p++)i[p]=a[p];return n.createElement.apply(null,i)}return n.createElement.apply(null,a)}d.displayName="MDXCreateElement"},26129:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>s,contentTitle:()=>i,default:()=>u,frontMatter:()=>l,metadata:()=>o,toc:()=>p});var n=a(74011),r=(a(49231),a(54852));const l={title:"Getting Started",sidebar_position:2,sidebar_label:"Getting Started"},i=void 0,o={unversionedId:"documentation/getting-started",id:"documentation/getting-started",title:"Getting Started",description:"View this page on the UpscalerJS website",source:"@site/docs/documentation/getting-started.md",sourceDirName:"documentation",slug:"/documentation/getting-started",permalink:"/documentation/getting-started",draft:!1,tags:[],version:"current",sidebarPosition:2,frontMatter:{title:"Getting Started",sidebar_position:2,sidebar_label:"Getting Started"},sidebar:"documentationSidebar",previous:{title:"Introduction",permalink:"/documentation/"},next:{title:"Guides",permalink:"/documentation/guides/"}},s={},p=[{value:"Quick Start",id:"quick-start",level:2},{value:"Browser Setup",id:"browser-setup",level:2},{value:"Usage via Script Tag",id:"usage-via-script-tag",level:3},{value:"Installation from NPM",id:"installation-from-npm",level:3},{value:"Node",id:"node",level:2},{value:"tfjs-node",id:"tfjs-node",level:3},{value:"tfjs-node-gpu",id:"tfjs-node-gpu",level:3},{value:"Usage",id:"usage",level:2},{value:"Instantiation",id:"instantiation",level:3},{value:"Upscaling",id:"upscaling",level:3},{value:"Performance",id:"performance",level:4}],c={toc:p};function u(e){let{components:t,...a}=e;return(0,r.kt)("wrapper",(0,n.Z)({},c,a,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("a",{class:"docs-link",href:"https://upscalerjs.com/documentation/getting-started"},"View this page on the UpscalerJS website"),(0,r.kt)("h1",{id:"getting-started"},"Getting Started"),(0,r.kt)("h2",{id:"quick-start"},"Quick Start"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"// browser-only; see below for Node.js instructions\nimport Upscaler from 'upscaler'; \nconst upscaler = new Upscaler();\nupscaler.upscale('/image/path').then(upscaledSrc => {\n  // base64 representation of image src\n  console.log(upscaledSrc);\n});\n")),(0,r.kt)("h2",{id:"browser-setup"},"Browser Setup"),(0,r.kt)("p",null,"In the browser, we can install UpscalerJS via a script tag or by installing via NPM and using a build tool like webpack, parcel, or rollup."),(0,r.kt)("admonition",{type:"tip"},(0,r.kt)("p",{parentName:"admonition"},"For runnable code examples, check out ",(0,r.kt)("a",{parentName:"p",href:"/documentation/guides/browser/basic-umd"},"the guide on Script Tag Installation")," and ",(0,r.kt)("a",{parentName:"p",href:"/documentation/guides/browser/basic-npm"},"the guide on installation via NPM"),".")),(0,r.kt)("h3",{id:"usage-via-script-tag"},"Usage via Script Tag"),(0,r.kt)("p",null,"First, ",(0,r.kt)("a",{parentName:"p",href:"https://www.tensorflow.org/js/tutorials/setup"},"ensure we've followed the instructions to install Tensorflow.js"),"."),(0,r.kt)("p",null,"Then add the following tags to our HTML file:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-HTML"},'<script src="https://cdn.jsdelivr.net/npm/@upscalerjs/default-model@latest/dist/umd/index.min.js"><\/script>\n<script src="https://cdn.jsdelivr.net/npm/upscaler@latest/dist/browser/umd/upscaler.min.js"><\/script>\n')),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"Upscaler")," will be available globally on our page. To use:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},'<script type="text/javascript">\n  const upscaler = new Upscaler({\n    model: DefaultUpscalerJSModel,\n  })\n<\/script>\n')),(0,r.kt)("p",null,"For a runnable code example, ",(0,r.kt)("a",{parentName:"p",href:"/documentation/guides/browser/basic-umd"},"check out the guide on script tag usage"),"."),(0,r.kt)("h3",{id:"installation-from-npm"},"Installation from NPM"),(0,r.kt)("p",null,"We can install UpscalerJS from NPM. Ensure Tensorflow.js is installed alongside it."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"npm install upscaler @tensorflow/tfjs\n")),(0,r.kt)("p",null,"To use:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"import Upscaler from 'upscaler'\nconst upscaler = new Upscaler()\n")),(0,r.kt)("p",null,"We can install specific models with NPM as well:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"npm install @upscalerjs/esrgan-thick\n")),(0,r.kt)("p",null,(0,r.kt)("a",{parentName:"p",href:"/models"},"A full list of official models is available here"),". We can also use custom models others have trained."),(0,r.kt)("p",null,"For a runnable code example, ",(0,r.kt)("a",{parentName:"p",href:"/documentation/guides/browser/basic-npm"},"check out the guide on NPM usage"),"."),(0,r.kt)("h2",{id:"node"},"Node"),(0,r.kt)("p",null,"Install UpscalerJS and the targeted platform of Tensorflow.js. ",(0,r.kt)("a",{parentName:"p",href:"/models"},"We can also install specific models"),"."),(0,r.kt)("admonition",{type:"tip"},(0,r.kt)("p",{parentName:"admonition"},"For a runnable code example, check out ",(0,r.kt)("a",{parentName:"p",href:"/documentation/guides/node/nodejs"},"the guide on Node.js usage"),".")),(0,r.kt)("h3",{id:"tfjs-node"},"tfjs-node"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"npm install upscaler @tensorflow/tfjs-node\n")),(0,r.kt)("p",null,"To use:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"const Upscaler = require('upscaler/node');\nconst upscaler = new Upscaler();\nupscaler.upscale('/image/path').then(upscaledSrc => {\n  // base64 representation of image src\n  console.log(upscaledSrc);\n});\n")),(0,r.kt)("h3",{id:"tfjs-node-gpu"},"tfjs-node-gpu"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-bash"},"npm install upscaler @tensorflow/tfjs-node-gpu\n")),(0,r.kt)("p",null,"To use:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"const Upscaler = require('upscaler/node-gpu');\nconst upscaler = new Upscaler();\nupscaler.upscale('/image/path').then(upscaledSrc => {\n  // base64 representation of image src\n  console.log(upscaledSrc);\n});\n")),(0,r.kt)("h2",{id:"usage"},"Usage"),(0,r.kt)("h3",{id:"instantiation"},"Instantiation"),(0,r.kt)("p",null,"By default, when UpscalerJS is instantiated, it uses the default model, ",(0,r.kt)("a",{parentName:"p",href:"https://npmjs.com/package/@upscalerjs/default-model"},(0,r.kt)("inlineCode",{parentName:"a"},"@upscalerjs/default-model")),". We can install alternative models by installing them and providing them as an argument. "),(0,r.kt)("admonition",{type:"tip"},(0,r.kt)("p",{parentName:"admonition"},"For a runnable code example, check out ",(0,r.kt)("a",{parentName:"p",href:"/documentation/guides/browser/models"},"the guide on providing models"),".")),(0,r.kt)("p",null,"For instance, to use ",(0,r.kt)("inlineCode",{parentName:"p"},"@upscalerjs/esrgan-thick"),", we'd first install it:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-sh"},"npm install @upscalerjs/esrgan-thick\n")),(0,r.kt)("p",null,"And then import and provide it:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"import Upscaler from 'upscaler';\nimport x4 from '@upscalerjs/esrgan-thick/4x';\nconst upscaler = new Upscaler({\n  model: x4,\n});\n")),(0,r.kt)("p",null,(0,r.kt)("a",{parentName:"p",href:"/models"},"A full list of models can be found here"),"."),(0,r.kt)("p",null,"Alternatively, we can provide a path to a pre-trained model of our own:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"const upscaler = new Upscaler({\n  model: {\n    path: '/path/to/model',\n    scale: 2,\n  },\n});\n")),(0,r.kt)("p",null,"When providing our own model, ",(0,r.kt)("strong",{parentName:"p"},"we must provide an explicit scale"),"."),(0,r.kt)("p",null,(0,r.kt)("a",{parentName:"p",href:"/documentation/api/constructor#parameters"},"See the API documentation for a model definition here"),"."),(0,r.kt)("h3",{id:"upscaling"},"Upscaling"),(0,r.kt)("p",null,"We can upscale an image with the following code:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"upscaler.upscale('/path/to/image').then(img => {\n  console.log(img);\n});\n")),(0,r.kt)("p",null,"In the browser, we can provide the image in any of the following formats:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"string")," - A URL to an image. Ensure the image can be loaded (for example, make sure the site's CORS policy allows for loading)."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"tf.Tensor3D")," or ",(0,r.kt)("inlineCode",{parentName:"li"},"tf.Tensor4D")," - A tensor representing an image."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("a",{parentName:"li",href:"https://js.tensorflow.org/api/latest/#browser.fromPixels"},"Any valid input to ",(0,r.kt)("inlineCode",{parentName:"a"},"tf.browser.fromPixels")))),(0,r.kt)("p",null,"In Node, we can provide the image in any of the following formats:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"string")," - A path to a local image, ",(0,r.kt)("em",{parentName:"li"},"or")," if provided a string that begins with ",(0,r.kt)("inlineCode",{parentName:"li"},"http"),", a URL to a remote image."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"tf.Tensor3D")," or ",(0,r.kt)("inlineCode",{parentName:"li"},"tf.Tensor4D")," - A tensor representing an image."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"Uint8Array")," - a ",(0,r.kt)("inlineCode",{parentName:"li"},"Uint8Array")," representing an image."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"Buffer")," - a ",(0,r.kt)("inlineCode",{parentName:"li"},"Buffer")," representing an image.")),(0,r.kt)("p",null,"By default, a base64-encoded ",(0,r.kt)("inlineCode",{parentName:"p"},"src")," attribute is returned. We can change the output type like so:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"upscaler.upscale('/path/to/image', {\n  output: 'tensor',\n}).then(img => {\n  console.log(img);\n});\n")),(0,r.kt)("p",null,"The available types for output are:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"src")," - A src URL of the upscaled image."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"tf.Tensor3D")," - The raw tensor.")),(0,r.kt)("h4",{id:"performance"},"Performance"),(0,r.kt)("p",null,"For larger images, attempting to run inference can impact UI performance."),(0,r.kt)("admonition",{type:"tip"},(0,r.kt)("p",{parentName:"admonition"},"For runnable code examples, check out ",(0,r.kt)("a",{parentName:"p",href:"/documentation/guides/browser/performance/patch-sizes"},"the guide on patch sizes"),".")),(0,r.kt)("p",null,"To address this, we can provide a ",(0,r.kt)("inlineCode",{parentName:"p"},"patchSize"),' parameter to infer the image in "patches" and avoid blocking the UI. We will likely also want to provide a ',(0,r.kt)("inlineCode",{parentName:"p"},"padding")," parameter:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"({\n  patchSize: 64,\n  padding: 5,\n})\n")),(0,r.kt)("p",null,"Without padding, images will usually end up with unsightly artifacting at the seams between patches. We should use as small a padding value as we can get away with (usually anything above 3 will avoid artifacting)."),(0,r.kt)("p",null,"Smaller patch sizes will block the UI less, but also increase overall inference time for a given image."))}u.isMDXComponent=!0}}]);