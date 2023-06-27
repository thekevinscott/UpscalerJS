"use strict";(self.webpackChunk_upscalerjs_docs=self.webpackChunk_upscalerjs_docs||[]).push([[3847],{54852:(e,t,o)=>{o.d(t,{Zo:()=>c,kt:()=>p});var n=o(49231);function r(e,t,o){return t in e?Object.defineProperty(e,t,{value:o,enumerable:!0,configurable:!0,writable:!0}):e[t]=o,e}function i(e,t){var o=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),o.push.apply(o,n)}return o}function s(e){for(var t=1;t<arguments.length;t++){var o=null!=arguments[t]?arguments[t]:{};t%2?i(Object(o),!0).forEach((function(t){r(e,t,o[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(o)):i(Object(o)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(o,t))}))}return e}function a(e,t){if(null==e)return{};var o,n,r=function(e,t){if(null==e)return{};var o,n,r={},i=Object.keys(e);for(n=0;n<i.length;n++)o=i[n],t.indexOf(o)>=0||(r[o]=e[o]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)o=i[n],t.indexOf(o)>=0||Object.prototype.propertyIsEnumerable.call(e,o)&&(r[o]=e[o])}return r}var d=n.createContext({}),l=function(e){var t=n.useContext(d),o=t;return e&&(o="function"==typeof e?e(t):s(s({},t),e)),o},c=function(e){var t=l(e.components);return n.createElement(d.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},m=n.forwardRef((function(e,t){var o=e.components,r=e.mdxType,i=e.originalType,d=e.parentName,c=a(e,["components","mdxType","originalType","parentName"]),m=l(o),p=r,f=m["".concat(d,".").concat(p)]||m[p]||u[p]||i;return o?n.createElement(f,s(s({ref:t},c),{},{components:o})):n.createElement(f,s({ref:t},c))}));function p(e,t){var o=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=o.length,s=new Array(i);s[0]=m;var a={};for(var d in t)hasOwnProperty.call(t,d)&&(a[d]=t[d]);a.originalType=e,a.mdxType="string"==typeof e?e:r,s[1]=a;for(var l=2;l<i;l++)s[l]=o[l];return n.createElement.apply(null,s)}return n.createElement.apply(null,o)}m.displayName="MDXCreateElement"},51226:(e,t,o)=>{o.r(t),o.d(t,{assets:()=>d,contentTitle:()=>s,default:()=>u,frontMatter:()=>i,metadata:()=>a,toc:()=>l});var n=o(74011),r=(o(49231),o(54852));const i={category:"Node",hide_table_of_contents:!0,sidebar_position:1003,code_embed:{params:"view=split,preview&module=index.js&hidenavigation=1",type:"codesandbox",url:"/examples/nodejs-custom-models"}},s="Node.js Custom Models Guide",a={unversionedId:"documentation/guides/node/nodejs-custom-models",id:"documentation/guides/node/nodejs-custom-models",title:"Node.js Custom Models Guide",description:"Demonstration of loading a custom model in Node.js.",source:"@site/docs/documentation/guides/node/nodejs-custom-models.md",sourceDirName:"documentation/guides/node",slug:"/documentation/guides/node/nodejs-custom-models",permalink:"/documentation/guides/node/nodejs-custom-models",draft:!1,tags:[],version:"current",sidebarPosition:1003,frontMatter:{category:"Node",hide_table_of_contents:!0,sidebar_position:1003,code_embed:{params:"view=split,preview&module=index.js&hidenavigation=1",type:"codesandbox",url:"/examples/nodejs-custom-models"}},sidebar:"documentationSidebar",previous:{title:"Node.js Model Guide",permalink:"/documentation/guides/node/nodejs-model"},next:{title:"API",permalink:"/documentation/api/"}},d={},l=[{value:"Code",id:"code",level:2}],c={toc:l};function u(e){let{components:t,...o}=e;return(0,r.kt)("wrapper",(0,n.Z)({},c,o,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"nodejs-custom-models-guide"},"Node.js Custom Models Guide"),(0,r.kt)("p",null,"Demonstration of loading a custom model in Node.js."),(0,r.kt)("a",{href:"https://githubbox.com/thekevinscott/upscalerjs/tree/main/examples/nodejs"},"Open in CodeSandbox"),".",(0,r.kt)("h2",{id:"code"},"Code"),(0,r.kt)("p",null,"If we wish to serve our models from a different point on our file system, ",(0,r.kt)("em",{parentName:"p"},"or")," we've brought our own custom model to use in Node.js, we can specify that easily."),(0,r.kt)("admonition",{type:"note"},(0,r.kt)("p",{parentName:"admonition"},"We'll be using the 2x model from ",(0,r.kt)("inlineCode",{parentName:"p"},"esrgan-slim")," for this example.")),(0,r.kt)("p",null,"We can specify the model definition with:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"const Upscaler = require('upscaler/node')\nconst upscaler = new Upscaler({\n  model: {\n    scale: 2,\n    path: tf.io.fileSystem('/path/to/model.json'),\n  }\n})\n")),(0,r.kt)("p",null,"For more information on the ",(0,r.kt)("inlineCode",{parentName:"p"},"model")," option's attributes, ",(0,r.kt)("a",{parentName:"p",href:"../browser/usage/self-hosting-models#model-options"},"see the section on custom model definitions"),"."))}u.isMDXComponent=!0}}]);