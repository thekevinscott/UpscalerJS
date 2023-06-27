(self.webpackChunk_upscalerjs_docs=self.webpackChunk_upscalerjs_docs||[]).push([[2436],{3817:(e,t,a)=>{"use strict";a.d(t,{z:()=>i});var n=a(74011),s=a(49231),r=a(61853),l=a(72269);const i=e=>{let{onClick:t,...a}=e;const i=(0,r.T)(t,"click","touch");return s.createElement(l.x5,(0,n.Z)({ref:i},a))}},19053:(e,t,a)=>{"use strict";a.d(t,{ZP:()=>x,yz:()=>w});var n=a(74011),s=a(25484);function r(e){return e&&"object"==typeof e&&!Array.isArray(e)}function l(e){for(var t=arguments.length,a=new Array(t>1?t-1:0),n=1;n<t;n++)a[n-1]=arguments[n];if(!a.length)return e;const s=a.shift();if(r(e)&&r(s))for(const i in s)r(s[i])?(e[i]||Object.assign(e,{[i]:{}}),l(e[i],s[i])):Object.assign(e,{[i]:s[i]});return l(e,...a)}var i=a(49231),o=a(21691),c=a(34864);o.kL.register(o.uw,o.f$,o.ZL,o.Dx,o.u,o.De,o.od,o.jn);const d="scaleType_qIXq",m="scaleTypeInner_UCBl",u=e=>{let{toggleScaleType:t}=e;const a=(0,i.useMemo)((()=>`scaleType-${Math.random()}`),[]);return i.createElement("div",{className:d},i.createElement("div",{className:m},i.createElement("input",{type:"checkbox",id:a,onClick:e=>t(e.target.checked)}),i.createElement("label",{htmlFor:a},"Relative Y")))},p="tooltip_Odjd",h="arrow_Im4p",v="rightArrow_pIrI",g="bottomArrow_BgF1";var f=a(19841);const k=e=>{let{setHovering:t,tooltip:a,children:n}=e;const s=(0,i.useRef)(),r=(0,i.useCallback)((()=>{t(!0)}),[]),l=(0,i.useCallback)((()=>{t(!1)}),[]);(0,i.useEffect)((()=>{const e=s.current;if(e)return e.addEventListener("mouseenter",r),e.addEventListener("mouseleave",l),()=>{e.removeEventListener("mouseenter",r),e.removeEventListener("mouseleave",l)}}),[s]);const{bottomArrow:o,rightArrow:c,...d}=(0,i.useMemo)((()=>((e,t)=>{let a=e,n=t,s=!1,r=!1;return document.body.clientWidth-n<442&&(s=!0,n-=502),document.body.clientHeight-a<442&&(a-=427,r=!0),{rightArrow:s,bottomArrow:r,top:a,left:n}})(a.top,a.left)),[a.top,a.left]);return i.createElement("div",{ref:s,className:p,style:d},i.createElement("div",{className:(0,f.Z)(h,c?v:void 0,o?g:void 0)}),n(a))},E=e=>{let{tooltip:t,children:a}=e;const[n,s]=(0,i.useState)(!1);return n||0!==t.opacity?i.createElement(k,{setHovering:s,tooltip:t},a):null};var b=a(21485);const w=()=>(0,i.useCallback)(((e,t)=>{const a=new URLSearchParams(window.location.search);a.set(e,t),window.history.replaceState({},"",`${location.pathname}?${a.toString()}`)}),[]);function N(e,t,a,n){const{colorMode:r}=(0,s.I)(),o=(0,i.useMemo)((()=>{const s=(e=>{const t="dark"===e?"rgb(227, 227, 227)":"rgb(28, 30, 33)",a="dark"===e?"rgba(227, 227, 227, 0.1)":"rgba(28, 30, 33, 0.1)";return{elements:{bar:{borderWidth:2}},responsive:!0,plugins:{legend:{position:"right",labels:{color:t}},title:{display:!0,text:"Performance Benchmarks",color:t}},scales:{x:{grid:{color:a},ticks:{color:t}},y:{grid:{color:a},ticks:{color:t}}}}})(r),[i,o]=t?function(e,t){let{datasets:a}=e;void 0===t&&(t=.02);let n=1/0,s=-1/0;return a.forEach((e=>{let{data:t}=e;t.forEach((e=>{if("number"!=typeof e)throw new Error("Invalid value provided.");e<n&&(n=e),e>s&&(s=e)}))})),[n*(1-t),s*(1+t)]}(a):[void 0,void 0];return l(s,{scales:{y:{min:i,max:o}}},n,{plugins:{title:{text:e}}})}),[e,r,n,t,JSON.stringify(a)]);return o}const y=()=>{const[e,t]=(0,i.useState)(!1),[a,n]=(0,i.useState)(window.visualViewport.width);return(e=>{(0,i.useEffect)((()=>(window.addEventListener("resize",e),()=>{window.removeEventListener("resize",e)})),[e])})((0,i.useCallback)((()=>{a!==window.visualViewport.width&&(n(window.visualViewport.width),t(!1))}),[])),(0,i.useEffect)((()=>{!1===e&&t(!0)}),[e]),e};function S(e){let{relativeScale:t,type:a,title:n,options:s,data:r,plugins:l}=e;const o=y(),d=N(n,t,r,s);return!1===o?i.createElement("div",null):"line"===a?i.createElement(c.x1,{options:d,data:r,plugins:l}):i.createElement(c.$Q,{options:d,data:r,plugins:l})}function x(e){let{children:t,...a}=e;const[s,r]=function(){const[e,t]=(0,i.useState)({opacity:0,top:0,left:0,label:void 0,value:void 0,index:void 0});return[e,(0,i.useCallback)((e=>{if(!("tooltip"in e))throw new Error("Invalid context provided");const a=e.tooltip;if(0===a.opacity)t((e=>({...e,opacity:0})));else{const n=e.chart.canvas.getBoundingClientRect();t({opacity:1,left:n.left+a.caretX+10,top:n.top+a.caretY,index:a.dataPoints[0].dataIndex,label:a.dataPoints[0].label,value:a.dataPoints[0].formattedValue})}}),[])]}(),o=Boolean(t),[c,d]=(0,i.useState)(!1);return i.createElement("div",{className:b.Z.chart},i.createElement(u,{toggleScaleType:e=>{d(e)}}),o&&i.createElement(E,{tooltip:s},t),i.createElement(S,(0,n.Z)({},a,{relativeScale:c,options:l(a.options,o?{plugins:{tooltip:{enabled:!1,external:r}}}:{})})))}},60767:(e,t,a)=>{"use strict";a.d(t,{E:()=>r});var n=a(22789),s=a.n(n);function r(e,t,a){void 0===a&&(a=1);const n=function(e,t){void 0===t&&(t=1);for(let a=0;a<t;a++)e.push(e.shift());return e}(s()(t,e.length),a);return n.reduce(((t,a,n)=>({...t,[e[n]]:`#${a}`})),{})}},28561:(e,t,a)=>{"use strict";a.d(t,{n:()=>c});var n=a(15650),s=a(43877),r=a(49231),l=a(98034);const i="modelFilter_IdVn";function o(e,t){const[a,n]=(0,r.useState)(),[l,i]=(0,r.useState)(),{query:o}=(0,s.Wz)(e),c=(0,r.useCallback)((async()=>{const e=await o(t);n(e)}),[o]);(0,r.useEffect)((()=>{c()}),[c]);return{data:a,onChange:(0,r.useCallback)((e=>{i(e)}),[]),selectedItems:l}}const c=e=>{let{databasePath:t,onChange:a}=e;const{availablePackages:s,setSelectedPackages:c,selectedPackages:d}=(e=>{const{data:t,onChange:a,selectedItems:n}=o(e,"\n    SELECT p.id, p.name FROM packages p \n    WHERE 1=1\n    /* AND p.name != 'default-model' */\n    AND p.name != 'esrgan-experiments'\n    GROUP BY p.name\n  ");return(0,r.useEffect)((()=>{t&&void 0===n&&a(t.map((e=>e.name)))}),[n,t]),{availablePackages:t,setSelectedPackages:a,selectedPackages:n}})(t),{availableScales:m,setSelectedScales:u,selectedScales:p}=(e=>{const{data:t,onChange:a,selectedItems:n}=o(e,"\n    SELECT m.scale FROM models m GROUP BY m.scale\n  ");return(0,r.useEffect)((()=>{t&&void 0===n&&a(t.map((e=>{let{scale:t}=e;return`${t}`})))}),[n,t]),{availableScales:t,setSelectedScales:a,selectedScales:n}})(t);return(0,r.useEffect)((()=>{a({packages:d,scales:p})}),[d,p]),r.createElement("div",{className:i},s&&r.createElement(l.h,{title:"Packages",allLabel:"All Packages",multi:!0,onChange:c,defaultValue:s.map((e=>e.name))},s.map((e=>{let{name:t}=e;return r.createElement(n.Z,{key:t,value:t,checked:null==d?void 0:d.includes(t)},t)}))),m&&r.createElement(l.h,{title:"Scales",allLabel:"All Scales",multi:!0,onChange:u,defaultValue:m.map((e=>{let{scale:t}=e;return`${t}`}))},m.map((e=>{const t=`${e.scale}`;return r.createElement(n.Z,{key:t,value:t,checked:null==p?void 0:p.includes(t)},t)}))))}},65002:(e,t,a)=>{"use strict";a.d(t,{t:()=>l});var n=a(49231);const s="modelTooltip_fuJb",r="packageName_wwXH",l=e=>{let{model:t}=e;const{upscaledImageSrc:a,packageName:l,modelName:i}=(e=>{const[t,a]=(0,n.useMemo)((()=>(e=>{const t=e.split("/");return[t[0],t.slice(1).join("/")]})(e)),[e]),s=(0,n.useMemo)((()=>((e,t)=>`http://localhost:3000/assets/sample-images/${e}/samples/${"."===t?"2x":t}/flower.png`)(t,a)),[t,a]);return{packageName:t,modelName:a,upscaledImageSrc:s}})(t);return n.createElement("div",{className:s},n.createElement("h1",null,n.createElement("a",{href:`/models/Models/${l}#${i}`},n.createElement("span",{className:r},l)," / ",i)),n.createElement("table",null,n.createElement("tbody",null,n.createElement("tr",null,n.createElement("td",null,"Original"),n.createElement("td",null,"Upscaled")),n.createElement("tr",null,n.createElement("td",null,n.createElement("img",{src:"/assets/flower.png",alt:"Original Image",title:"Original non-upscaled image"})),n.createElement("td",null,n.createElement("img",{src:a,alt:"Upscaled Image",title:`Upscaled by ${l} with model ${i}`}))))))}},25335:(e,t,a)=>{"use strict";a.d(t,{Z:()=>r});var n=a(49231),s=a(81245);function r(e){return n.createElement(s.Z,null,(()=>{const{PerformanceChart:t}=a(5416);return n.createElement(t,e)}))}},5416:(e,t,a)=>{"use strict";a.r(t),a.d(t,{PerformanceChart:()=>C});var n=a(49231),s=a(19053),r=a(98034),l=a(21485),i=a(26372),o=a.n(i),c=a(60767),d=a(73102);const m=["PSNR","SSIM"],u=["Div2K","FFHQ","Flickr2K"],p=e=>e.toLowerCase(),h=(0,c.E)(u.map(p),"mpn65",2),v=e=>(0,d.H)(e)&&u.includes(e);function g(e,t,a){return n=>{var s;const r=(null==(s=n.get(e))?void 0:s.split(","))||[],l=[];for(let e=0;e<r.length;e++){const a=r[e];t(a)&&l.push(a)}return l.length?l:a}}const f=g("metrics",(e=>(0,d.H)(e)&&m.includes(e)),["PSNR"]),k=g("datasets",v,["Div2K"]);var E=a(43877);const b=(e,t)=>{let{dataset:a,asc:n=!1}=t;if(!e.length)return{labels:[],datasets:[]};const s=e.reduce(((e,t)=>{let{dataset:a,...n}=t;const s=e[a]||{};return{...e,[a]:{...s,[n.model.id]:n}}}),{});(e=>{let t;const a=Object.values(e);a.forEach((e=>{if(void 0===t)t=Object.keys(e).length;else if(t!==Object.keys(e).length)throw console.error(a[0],e),new Error("Mismatch in results")}))})(s);const r=s[a]?s[a]:s[e[0].dataset],l=Object.values(r).sort(((e,t)=>{let{value:a}=e,{value:s}=t;return n?a-s:s-a})).map((e=>e.model.id)),i=Object.entries(s).map((e=>{let[t,s]=e;const r=h[t];let i=t;return a===t&&(i+=" "+(n?"\u2b06":"\u2b07")),{label:i,data:l.map((e=>{if(!s[e])throw new Error(`No value found for model id ${e} on dataset ${t}`);return s[e].value})),backgroundColor:r,borderWidth:0}}));return{labels:l.map((e=>{const{model:t}=r[e];return[t.package,t.name.split("./").pop()].filter(Boolean).join("/")})),datasets:i}};var w=a(28561),N=a(65002),y=a(2785),S=a(15650);const x={Div2K:"https://data.vision.ee.ethz.ch/cvl/DIV2K/",FFHQ:"https://github.com/NVlabs/ffhq-dataset",Flickr2K:"https://github.com/LimBee/NTIRE2017"};function C(e){let{databasePath:t,package:a}=e;const i=(0,n.useMemo)((()=>new URLSearchParams(window.location.search)),[]),c=(0,s.yz)(),[h,g]=(0,n.useState)(f(i)),[C,I]=(0,n.useState)(k(i)),[P,M]=(0,n.useState)(((e,t)=>{const[a,n]=(0,d.$)(e,"activeDataset");return v(a)&&"boolean"==typeof n?{dataset:p(a),asc:n}:{dataset:p(t[0]),asc:!1}})(i,C)),[A,_]=(0,n.useState)(),R=((e,t,a)=>{let{packageName:s}=a;const{metrics:r,datasets:l,activeModel:i}=t,{query:o}=(0,E.Wz)(e),c=(0,n.useCallback)((async()=>{if(0===r.length||0===l.length)return[];const e=(s?[s]:null==i?void 0:i.packages)||[],t=e.length>0,a=[...r,...l.map((e=>p(e))),...(null==i?void 0:i.scales)||[],...e],n=`\n    \n  SELECT \n  r.value, \n  e.name as metric,\n  d.name as dataset,\n  m.id as modelId,\n  p.id as packageId,\n  m.meta,\n  m.name,\n  m.scale,\n  p.name as package\n  FROM results r\n  LEFT JOIN metrics e ON r.metricId = e.id\n  LEFT JOIN datasets d ON r.datasetId = d.id\n  LEFT JOIN models m ON r.modelId = m.id\n  LEFT JOIN packages p ON m.packageId = p.id\n  WHERE 1=1\n  AND p.name != 'esrgan-experiments'\n\n    AND metric IN ${(0,E.Q_)(r)}\n    AND dataset IN ${(0,E.Q_)(l)}\n    ${null!=i&&i.scales?`AND scale IN ${(0,E.Q_)(i.scales)}`:""}\n    ${t?`AND p.name IN ${(0,E.Q_)(e)}`:""}\n    ORDER BY p.id ASC, m.id ASC\n    `;return(await o(n,a)).filter((e=>!["esrgan-slim","esrgan-medium"].includes(e.package)||8!==e.scale)).map((e=>{let{packageId:t,modelId:a,name:n,package:s,scale:r,meta:l,...i}=e;return{...i,model:{id:a,packageId:t,name:n,package:s,scale:r,meta:JSON.parse(l)}}}))}),[o,JSON.stringify(t),s]),[d,m]=(0,n.useState)([]);return(0,n.useEffect)((()=>{c().then(m)}),[c]),d})(t,{metrics:h,datasets:C,activeModel:A},{packageName:a});(0,n.useEffect)((()=>{c("metrics",h.join(","))}),[c,h]),(0,n.useEffect)((()=>{if(c("datasets",C.join(",")),!C.map((e=>e.toLowerCase())).includes(P.dataset)){const e={dataset:C[0].toLowerCase(),asc:!1};c("activeDataset",[e.dataset,e.asc].join(",")),M(e)}}),[c,C,P]);const j=(0,n.useMemo)((()=>b(R,P)),[R,P]),L=(0,n.useMemo)((()=>({plugins:{legend:{onClick:(e,t)=>{let{datasetIndex:a}=t;const n=C[a].toLowerCase();M((e=>{const t=e.dataset===n?{dataset:n,asc:!e.asc}:{dataset:n,asc:!1};return c("activeDataset",[t.dataset,t.asc].join(",")),t}))}}}})),[C,j]),O=(0,n.useCallback)((e=>I(e.sort())),[]);return n.createElement("div",{className:l.Z.container},n.createElement("div",{className:l.Z.row},n.createElement("div",{className:l.Z.left},void 0===a&&n.createElement(w.n,{databasePath:t,onChange:_})),n.createElement("div",{className:l.Z.right},n.createElement(r.h,{title:"Datasets",placement:"bottom-end",multi:!0,onChange:O,defaultValue:C},u.map((e=>{return n.createElement(S.Z,{key:e,value:e,checked:C.includes(e)},e,n.createElement("a",{className:l.Z.optionLink,target:"_blank",href:(t=e,x[t])},n.createElement(y.rpH,null)));var t}))))),n.createElement(s.ZP,{type:"bar",title:"Performance Benchmarks",data:j,options:L},void 0===a?e=>n.createElement(N.t,{model:e.label}):void 0),n.createElement("small",null,"Performance measurements are done for 100 images of a given dataset. Images are randomly cropped to 240px."),n.createElement("div",{className:o()({[l.Z.row]:!0,[l.Z.center]:!0})},n.createElement(r.h,{title:"Metrics",onChange:g,defaultValue:h},m.map((e=>n.createElement(S.Z,{key:e,value:e,checked:h.includes(e)},e))))))}},69221:(e,t,a)=>{"use strict";a.d(t,{Z:()=>r});var n=a(49231),s=a(81245);function r(e){return n.createElement(s.Z,null,(()=>{const{SpeedChart:t}=a(71582);return n.createElement(t,e)}))}},71582:(e,t,a)=>{"use strict";a.r(t),a.d(t,{SpeedChart:()=>w});var n=a(49231),s=a(19053),r=a(21485),l=a(98034),i=a(15650),o=a(60767),c=a(73102);const d=!0,m=["iPad Mini 2021","iPhone 14 Pro Max","iPhone 14","iPhone 12 Mini","iPhone 12 Pro Max","iPad Pro 12.9 2021","Samsung Galaxy S22 Ultra","Samsung Galaxy S22","iPhone 13 Pro Max","Google Pixel 6","Google Pixel 6 Pro","iPhone 13","Google Pixel 7"],u=(0,o.E)(m,"mpn65"),p=e=>(0,c.H)(e)&&m.includes(e);const h=(v="devices",g=p,f=["iPhone 14 Pro Max"],e=>{var t;const a=(null==(t=e.get(v))?void 0:t.split(","))||[],n=[];for(let s=0;s<a.length;s++){const e=a[s];g(e)&&n.push(e)}return n.length?n:f});var v,g,f;var k=a(43877);var E=a(28561),b=a(65002);function w(e){let{databasePath:t,package:a}=e;const o=(0,n.useMemo)((()=>new URLSearchParams(window.location.search)),[]),[v,g]=(0,n.useState)(h(o)),[f,w]=(0,n.useState)((e=>{const[t,a]=(0,c.$)(e,"activeDevice");return p(t)&&"boolean"==typeof a?{device:t,asc:a}:{device:"iPhone 14 Pro Max",asc:d}})(o)),[N,y]=(0,n.useState)(),S=((e,t,a)=>{let{packageName:s}=a;const{devices:r,activeModel:l}=t,{query:i}=(0,k.Wz)(e),o=(0,n.useCallback)((async()=>{const e=(s?[s]:null==l?void 0:l.packages)||[],t=e.length>0;return(await i(`\n  SELECT \n  r.value, \n  r.times,\n  r.size,\n\n  d.id as deviceId,\n  d.os,\n  d.os_version,\n  d.browserName,\n  d.browser_version,\n  d.device,\n\n  m.id as modelId,\n  m.meta,\n  m.name,\n  m.scale,\n  p.id as packageId,\n  p.name as package\n  FROM results r\n  LEFT JOIN devices d ON r.deviceId = d.id\n  LEFT JOIN models m ON r.modelId = m.id\n  LEFT JOIN packages p ON m.packageId = p.id\n  WHERE 1=1\n\n      AND r.size = ?\n      AND d.device IN ${(0,k.Q_)(r)}\n      ${null!=l&&l.scales?`AND scale IN ${(0,k.Q_)(l.scales)}`:""}\n      ${t?`AND p.name IN ${(0,k.Q_)(e)}`:""}\n    `,[64,...r,...(null==l?void 0:l.scales)||[],...t?e:[]])).map((e=>{let{modelId:t,packageId:a,name:n,package:s,scale:r,meta:l,os:i,os_version:o,browserName:c,browser_version:d,device:m,deviceId:u,...p}=e;return{...p,device:{id:u,os:i,os_version:o,browserName:c,browser_version:d,device:m},model:{id:t,packageId:a,name:n,package:s,scale:r,meta:JSON.parse(l)}}}))}),[i,JSON.stringify(t),s]),[c,d]=(0,n.useState)([]);return(0,n.useEffect)((()=>{o().then(d)}),[o,JSON.stringify(t)]),c})(t,{devices:v,activeModel:N},{packageName:a}),x=(0,n.useMemo)((()=>((e,t)=>{let{device:a,asc:n=!1}=t;if(!e.length)return{labels:[],datasets:[]};const s=e.reduce(((e,t)=>{let{device:a,model:n,...s}=t;const r=a.device,l=e[r]||{device:a,models:{}};return{...e,[r]:{...l,models:{...l.models,[n.id]:{...s,model:n}}}}}),{}),{models:r}=s[a]?s[a]:s[e[0].device.device],l=Object.values(r).sort(((e,t)=>{let{value:a}=e,{value:s}=t;return n?a-s:s-a})).map((e=>e.model.id)),i=Object.values(s).map((e=>{let{device:t,models:s}=e;const r=u[t.device];let i=t.device;return a===t.device&&(i+=" "+(n?"\u2b06":"\u2b07")),{label:i,backgroundColor:r,borderWidth:0,data:l.map((e=>s[e]?s[e].value:0))}}));return{labels:l.map((e=>{const{model:t}=r[e];return[t.package,t.name.split("./").pop()].filter(Boolean).join("/")})),datasets:i}})(S,f)),[S,f]),C=(0,s.yz)(),I=(0,n.useMemo)((()=>({plugins:{legend:{onClick:(e,t)=>{let{datasetIndex:a}=t;const n=v[a];w((e=>{const t=e.device===n?{device:n,asc:!e.asc}:{device:n,asc:d};return C("activeDevice",[t.device,t.asc].join(",")),t}))}}}})),[v]);return(0,n.useEffect)((()=>{if(C("devices",v.join(",")),!v.includes(f.device)){const e={device:v[0],asc:d};C("activeDevice",[e.device,e.asc].join(",")),w(e)}}),[C,v,f]),n.createElement("div",{className:r.Z.container},n.createElement("div",{className:r.Z.row},n.createElement("div",{className:r.Z.left},void 0===a&&n.createElement(E.n,{databasePath:t,onChange:y})),n.createElement("div",{className:r.Z.right},n.createElement(l.h,{multi:!0,onChange:g,defaultValue:v},m.map((e=>n.createElement(i.Z,{key:e,value:e,checked:v.includes(e)},e)))))),n.createElement(s.ZP,{title:"Speed Benchmarks",type:"bar",data:x,options:I},void 0===a?e=>n.createElement(b.t,{model:e.label}):void 0),n.createElement("small",null,"All speed measurements are in milliseconds. Each measurement is an average of 1024 iterations: 32 iterations ",n.createElement("em",null,"within")," a browser tab, executed over 32 iterations ",n.createElement("em",null,"of")," a fresh browser tab. All models are warmed up before execution. Model performance can vary greatly, depending on device and running processes."))}},73102:(e,t,a)=>{"use strict";a.d(t,{$:()=>s,H:()=>n});const n=e=>Boolean(e)&&"string"==typeof e,s=(e,t)=>{var a;return(null==(a=e.get(t))?void 0:a.split(","))||[]}},6237:(e,t,a)=>{"use strict";a.d(t,{C:()=>d});var n=a(49231),s=a(53127),r=a(25484);const l={container:"container_WEfu",iframe:"iframe__s4O",overlay:"overlay_gMAZ",dragger:"dragger_RkEH",stackblitz:"stackblitz_zhK4",codesandbox:"codesandbox_nZ9h"};var i=a(19841);const o=e=>"codesandbox"===e?"githubbox.com/thekevinscott/upscalerjs/tree/main":"stackblitz.com/github/thekevinscott/upscalerjs/tree/main",c=e=>{let{onDrag:t,onDragging:a,text:s,type:r}=e;const[o,c]=(0,n.useState)(0),[d,m]=(0,n.useState)(!1),u=(0,n.useCallback)((e=>{if(d){t(e-o)}}),[t,o,d]);(0,n.useEffect)((()=>{const e=e=>{u(e.clientY)},t=e=>{u(e.touches[0].clientY)};return window.addEventListener("mousemove",e),window.addEventListener("touchmove",t),()=>{window.removeEventListener("mousemove",e),window.removeEventListener("touchmove",t)}}),[u]),(0,n.useEffect)((()=>{const e=()=>{m(!1)};return window.addEventListener("mouseup",e),window.addEventListener("touchend",e),()=>{window.removeEventListener("mouseup",e),window.removeEventListener("touchend",e)}}),[]);const p=(0,n.useCallback)((e=>{c(e),m(!0)}),[]);return(0,n.useEffect)((()=>{a(d)}),[d]),n.createElement("div",{className:(0,i.Z)(l.dragger,d?l.active:null,l[r]),onTouchStart:e=>p(e.touches[0].clientY),onMouseDown:e=>p(e.clientY)},s)},d=e=>{let{url:t,params:a,persist:i,type:d="stackblitz"}=e;const m=(0,s.Z)(),u=(0,n.useRef)(null),p=((e,t,a)=>{const{colorMode:s}=(0,r.I)();return(0,n.useMemo)((()=>{if(!e)throw new Error("No URL is provided");return`//${[...o(a).split("/"),...e.split("/")].filter(Boolean).join("/")}?${((e,t)=>"string"==typeof e?`${e}&theme=${t}`:(e.set("theme",t),e.toString()))(t,s)}`}),[e,t.toString(),s,a])})(t,a,d),[h,v]=(0,n.useState)((e=>(0,n.useMemo)((()=>{if(e){const e=Number(localStorage.getItem("example-height"));if(!Number.isNaN(e))return e;if(window.innerWidth<=997)return 0}return 300}),[e]))(m)),[g,f]=(0,n.useState)(0),[k,E]=(0,n.useState)(!1);(0,n.useEffect)((()=>{!1===k&&(v(h+g),f(0))}),[k]),(0,n.useEffect)((()=>{localStorage.setItem("example-height",`${h}`)}),[h]);const b=(0,n.useMemo)((()=>(e=>"codesandbox"===e?20:32)(d)),[d]),w=((e,t,a,s)=>(0,n.useMemo)((()=>{var n;const r=t+a;if(e&&null!=(n=window)&&n.visualViewport){if(window.visualViewport.height-60-100<r)return window.visualViewport.height-60;if(r<100)return s}return r}),[e,t,a]))(m,h,g,b),N=(0,n.useMemo)((()=>w===b?"Drag to expand":"Drag to resize"),[w,b]);return i?n.createElement("div",{className:l.container,style:{height:w}},k&&n.createElement("div",{className:l.overlay}),n.createElement("iframe",{className:l.iframe,ref:u,src:p}),m&&n.createElement(c,{type:d,onDragging:E,onDrag:f,text:N})):n.createElement("iframe",{className:l.iframe,ref:u,src:p})}},98034:(e,t,a)=>{"use strict";a.d(t,{h:()=>m});var n=a(74011),s=a(49231),r=a(61853);const l="title_hJBh";var i=a(41319),o=a(80106),c=a(3817),d=a(54689);function m(e){let{title:t,placement:a="bottom-start",allLabel:m,children:u,multi:p=!1,defaultValue:h,onChange:v,...g}=e;const[f,k]=(0,s.useState)(new Set);(0,d.L)();const E=(0,s.useCallback)((function(e,t){void 0===t&&(t=!1),e&&k(p?a=>(t&&a.has(e)?a.size>1&&a.delete(e):a.add(e),new Set(a)):new Set([e]))}),[p]);(0,s.useEffect)((()=>{h&&h.forEach((e=>E(e)))}),[]);const b=(0,r.T)((e=>E(e.value,!0)),"click","touch"),w=(0,s.useMemo)((()=>0===f.size?h:m&&f.size===h.length?m:(e=>{const t=Array.from(e);return t.length<=2?t.join(" and "):[[...t.slice(0,-1),""].join(", "),t[t.length-1]].filter(Boolean).join(" and ")})(f)),[m,f,h]);return(0,s.useEffect)((()=>{v&&v(Array.from(f))}),[f,v]),s.createElement("div",null,t&&s.createElement("label",{className:l},t),s.createElement(i.Z,(0,n.Z)({stayOpenOnSelect:!0,placement:a,distance:20},g),s.createElement(c.z,{slot:"trigger",caret:!0},w),s.createElement(o.Z,{ref:b},u)))}},89947:(e,t,a)=>{"use strict";a.d(t,{Z:()=>r});var n=a(49231),s=a(6237);const r=e=>{let{model:t}=e;const a=(0,n.useMemo)((()=>{const e=new URLSearchParams;return e.set("file","index.js"),e.set("title",`@upscalerjs/${t}`),e.set("ctl","1"),e}),[]);return n.createElement(s.C,{url:`models/${t}/demo`,params:a})}},49262:(e,t,a)=>{"use strict";a.d(t,{Z:()=>d});var n=a(49231);const s="options_m2t7",r="option_RQh5",l="container_UfJ0",i="sampleTable_uRA1",o=a.p+"assets/images/flower-68f7f0f3aef93b31d3970db3321c8179.png",c=128;function d(e){let{packageName:t,models:a,scales:d}=e;const[m,u]=(0,n.useState)(!1),[p,h]=(0,n.useState)(!1),v=(0,n.useMemo)((()=>d.reduce(((e,t)=>e<t?t:e),-1/0)),[d]),g=(0,n.useMemo)((()=>d.reduce(((e,t)=>p?e+v*c:e+t*c),p?v*c:c)),[d,p]);return n.createElement(n.Fragment,null,n.createElement("div",{className:s},n.createElement("div",{className:r},n.createElement("label",{htmlFor:"bicubic"},"View non-upscaled versions"),n.createElement("input",{onClick:()=>u((e=>!e)),type:"checkbox",id:"bicubic",name:"bicubic"})),n.createElement("div",{className:r},n.createElement("label",{htmlFor:"sameSize"},"View images all at same size"),n.createElement("input",{onClick:()=>h((e=>!e)),type:"checkbox",id:"sameSize",name:"same-size"}))),n.createElement("div",{className:l},n.createElement("table",{className:i,width:g},n.createElement("thead",null,n.createElement("tr",null,n.createElement("th",null,"Original"),a.map((e=>n.createElement("th",{key:e},e," ",m?"Original":"Upscaled"))))),n.createElement("tbody",null,n.createElement("tr",null,n.createElement("td",null,n.createElement("img",{alt:"Original image",src:o,width:p?v*c:c})),a.map(((e,a)=>{const s=d[a],r=(p?v:s)*c,l=m?o:`/assets/sample-images/${t}/samples/${e}/flower.png`;return n.createElement("td",{key:e},n.createElement("img",{alt:`Upscaled image using ${t}/${e}`,src:l,width:r}))})))))))}},61853:(e,t,a)=>{"use strict";a.d(t,{T:()=>s});var n=a(49231);function s(e){for(var t=arguments.length,a=new Array(t>1?t-1:0),s=1;s<t;s++)a[s-1]=arguments[s];const r=(0,n.useRef)(),l=(0,n.useCallback)((t=>{const a=t.target;e&&e(a,t)}),[e,JSON.stringify(a)]);return(0,n.useEffect)((()=>{const e=r.current;if(e)return a.forEach((t=>{e.addEventListener(t,l)})),()=>{a.forEach((t=>{e.removeEventListener(t,l)}))}}),[l,r]),r}},43877:(e,t,a)=>{"use strict";a.d(t,{Q_:()=>c,Wz:()=>o});var n=a(49231),s=a(69476),r=a.n(s);let l;const i=async e=>{l=r()({locateFile:e=>`/${e}`});const[t,a]=await Promise.all([await l,fetch(e).then((e=>e.arrayBuffer()))]);return new t.Database(new Uint8Array(a))},o=e=>{const[t,a]=(0,n.useState)(),s=(0,n.useCallback)((async()=>{const t=await i(e);return a(t),t}),[e]),r=(0,n.useCallback)((()=>t||s()),[e]);return{query:(0,n.useCallback)((async(e,t)=>{const a=(await r()).exec(e,t);try{const[{columns:e,values:t}]=a;return t.reduce(((t,a)=>{const n=a.reduce(((t,a,n)=>({...t,[e[n]]:a})),{});return t.concat(n)}),[])}catch(n){throw console.error(e,t),console.error(a),n}}),[r])}};function c(e){return e?`(${e.map((()=>"?")).join(",")})`:""}},94464:(e,t,a)=>{"use strict";a.r(t),a.d(t,{assets:()=>u,contentTitle:()=>d,default:()=>v,frontMatter:()=>c,metadata:()=>m,toc:()=>p});var n=a(74011),s=(a(49231),a(54852)),r=a(49262),l=a(89947),i=a(25335),o=a(69221);const c={title:"ESRGAN Medium",description:"Overview of @upscalerjs/esrgan-medium model",sidebar_position:2,sidebar_label:"esrgan-medium"},d="ESRGAN Medium",m={unversionedId:"models/available/esrgan-medium",id:"models/available/esrgan-medium",title:"ESRGAN Medium",description:"Overview of @upscalerjs/esrgan-medium model",source:"@site/docs/models/available/esrgan-medium.mdx",sourceDirName:"models/available",slug:"/models/available/esrgan-medium",permalink:"/models/available/esrgan-medium",draft:!1,tags:[],version:"current",sidebarPosition:2,frontMatter:{title:"ESRGAN Medium",description:"Overview of @upscalerjs/esrgan-medium model",sidebar_position:2,sidebar_label:"esrgan-medium"},sidebar:"modelsSidebar",previous:{title:"esrgan-slim",permalink:"/models/available/esrgan-slim"},next:{title:"esrgan-thick",permalink:"/models/available/esrgan-thick"}},u={},p=[{value:"Paper",id:"paper",level:2},{value:"Samples + Demo",id:"samples--demo",level:2},{value:"Installation",id:"installation",level:2},{value:"Usage",id:"usage",level:2},{value:"Available Models",id:"available-models",level:2},{value:"Performance + Speed Measurements",id:"performance--speed-measurements",level:2},{value:"Architecture",id:"architecture",level:2},{value:"Training Details",id:"training-details",level:2},{value:"License",id:"license",level:2}],h={toc:p};function v(e){let{components:t,...a}=e;return(0,s.kt)("wrapper",(0,n.Z)({},h,a,{components:t,mdxType:"MDXLayout"}),(0,s.kt)("h1",{id:"esrgan-medium"},"ESRGAN Medium"),(0,s.kt)("p",null,(0,s.kt)("a",{parentName:"p",href:"https://www.jsdelivr.com/package/npm/@upscalerjs/esrgan-medium"},(0,s.kt)("img",{parentName:"a",src:"https://data.jsdelivr.com/v1/package/npm/@upscalerjs/esrgan-medium/badge",alt:null}))),(0,s.kt)("p",null,"These models strike a balance between latency and image quality. They aim to be in the middle of speed and performance measurements between ",(0,s.kt)("a",{parentName:"p",href:"esrgan-slim"},(0,s.kt)("inlineCode",{parentName:"a"},"@upscalerjs/esrgan-slim"))," and ",(0,s.kt)("a",{parentName:"p",href:"esrgan-thick"},(0,s.kt)("inlineCode",{parentName:"a"},"@upscalerjs/esrgan-thick")),"."),(0,s.kt)("p",null,"The model weights were trained using the ",(0,s.kt)("a",{parentName:"p",href:"https://github.com/idealo/image-super-resolution"},(0,s.kt)("inlineCode",{parentName:"a"},"image-super-resolution")," Python repo")," and subsequently converted to Tensorflow.js models."),(0,s.kt)("h2",{id:"paper"},"Paper"),(0,s.kt)("blockquote",null,(0,s.kt)("p",{parentName:"blockquote"},"The Super-Resolution Generative Adversarial Network (SRGAN) is a seminal work that is capable of generating realistic textures during single image super-resolution. However, the hallucinated details are often accompanied with unpleasant artifacts. To further enhance the visual quality, we thoroughly study three key components of SRGAN - network architecture, adversarial loss and perceptual loss, and improve each of them to derive an Enhanced SRGAN (ESRGAN). In particular, we introduce the Residual-in-Residual Dense Block (RRDB) without batch normalization as the basic network building unit. Moreover, we borrow the idea from relativistic GAN to let the discriminator predict relative realness instead of the absolute value. Finally, we improve the perceptual loss by using the features before activation, which could provide stronger supervision for brightness consistency and texture recovery. Benefiting from these improvements, the proposed ESRGAN achieves consistently better visual quality with more realistic and natural textures than SRGAN and won the first place in the PIRM2018-SR Challenge.")),(0,s.kt)("p",null,"\u2014"," ",(0,s.kt)("a",{parentName:"p",href:"https://arxiv.org/abs/1809.00219"},"ESRGAN: Enhanced Super-Resolution Generative Adversarial Networks")),(0,s.kt)("h2",{id:"samples--demo"},"Samples + Demo"),(0,s.kt)("p",null,"Here are some examples of upscaled images using these models."),(0,s.kt)(r.Z,{packageName:"esrgan-medium",models:["2x","3x","4x"],scales:[2,3,4],mdxType:"SampleTable"}),(0,s.kt)(l.Z,{model:"esrgan-medium",mdxType:"ModelExample"}),(0,s.kt)("h2",{id:"installation"},"Installation"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre"},"npm install @upscalerjs/esrgan-medium\n")),(0,s.kt)("h2",{id:"usage"},"Usage"),(0,s.kt)("p",null,"Import a model, specified by its scale:"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre"},"import Upscaler from 'upscaler';\nimport x2 from '@upscalerjs/esrgan-medium/2x';\n\nconst upscaler = new Upscaler({\n  model: x2,\n})\n")),(0,s.kt)("h2",{id:"available-models"},"Available Models"),(0,s.kt)("p",null,"ESRGAN Medium ships with four models corresponding to the desired scale of the upscaled image:"),(0,s.kt)("ul",null,(0,s.kt)("li",{parentName:"ul"},"2x: ",(0,s.kt)("inlineCode",{parentName:"li"},"@upscalerjs/esrgan-medium/2x")),(0,s.kt)("li",{parentName:"ul"},"3x: ",(0,s.kt)("inlineCode",{parentName:"li"},"@upscalerjs/esrgan-medium/3x")),(0,s.kt)("li",{parentName:"ul"},"4x: ",(0,s.kt)("inlineCode",{parentName:"li"},"@upscalerjs/esrgan-medium/4x")),(0,s.kt)("li",{parentName:"ul"},"8x: ",(0,s.kt)("inlineCode",{parentName:"li"},"@upscalerjs/esrgan-medium/8x")," (",(0,s.kt)("em",{parentName:"li"},"note: the 8x model runs only in Node"),")")),(0,s.kt)("p",null,"All models are also exported via the root export:"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre"},"import Upscaler from 'upscaler';\nimport models from '@upscalerjs/esrgan-medium';\n\nconst upscaler = new Upscaler({\n  model: models.x2,\n  // model: models.x3,\n  // model: models.x4,\n  // model: models.x8,\n})\n")),(0,s.kt)("h2",{id:"performance--speed-measurements"},"Performance + Speed Measurements"),(0,s.kt)(i.Z,{package:"esrgan-medium",databasePath:"/assets/performance.sql",mdxType:"PerformanceChart"}),(0,s.kt)(o.Z,{package:"esrgan-medium",databasePath:"/assets/speed.sql",mdxType:"SpeedChart"}),(0,s.kt)("h2",{id:"architecture"},"Architecture"),(0,s.kt)("p",null,"This model is trained via a Python implementation of the ESRGAN architecture."),(0,s.kt)("ul",null,(0,s.kt)("li",{parentName:"ul"},"Paper: ",(0,s.kt)("a",{parentName:"li",href:"https://arxiv.org/abs/1809.00219"},"https://arxiv.org/abs/1809.00219")),(0,s.kt)("li",{parentName:"ul"},"Python Repo: ",(0,s.kt)("a",{parentName:"li",href:"https://github.com/idealo/image-super-resolution"},"https://github.com/idealo/image-super-resolution"))),(0,s.kt)("p",null,"The Python repo has instructions on training from scratch."),(0,s.kt)("h2",{id:"training-details"},"Training Details"),(0,s.kt)("p",null,"The model is trained on 4 scales."),(0,s.kt)("p",null,"The model is trained on the ",(0,s.kt)("a",{parentName:"p",href:"https://data.vision.ee.ethz.ch/cvl/DIV2K/"},"Div2k dataset"),"."),(0,s.kt)("p",null,"It was trained for 500 epochs, with the following hyperparameters:"),(0,s.kt)("ul",null,(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("strong",{parentName:"li"},"architecture"),": ",(0,s.kt)("inlineCode",{parentName:"li"},"rdn")),(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("strong",{parentName:"li"},"C"),": ",(0,s.kt)("inlineCode",{parentName:"li"},"1")),(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("strong",{parentName:"li"},"D"),": ",(0,s.kt)("inlineCode",{parentName:"li"},"10")),(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("strong",{parentName:"li"},"G"),": ",(0,s.kt)("inlineCode",{parentName:"li"},"64")),(0,s.kt)("li",{parentName:"ul"},(0,s.kt)("strong",{parentName:"li"},"G0"),": ",(0,s.kt)("inlineCode",{parentName:"li"},"64"))),(0,s.kt)("p",null,"The batch size was 12, and the batches per epoch was 20. The learning rate was set to ",(0,s.kt)("inlineCode",{parentName:"p"},"0.0004"),". The HR patch size was set to ",(0,s.kt)("inlineCode",{parentName:"p"},"128")," or ",(0,s.kt)("inlineCode",{parentName:"p"},"129")," depending on the scale (ensuring it is divisible by the scale) with the LR patch size being the resultant scale ",(0,s.kt)("inlineCode",{parentName:"p"},"HR_patch_size / scale"),"."),(0,s.kt)("h2",{id:"license"},"License"),(0,s.kt)("p",null,(0,s.kt)("a",{parentName:"p",href:"https://oss.ninja/mit/developit/"},"MIT License")," \xa9 ",(0,s.kt)("a",{parentName:"p",href:"https://thekevinscott.com"},"Kevin Scott")))}v.isMDXComponent=!0},21485:(e,t,a)=>{"use strict";a.d(t,{Z:()=>n});const n={container:"container_rFmT",row:"row_CE5B",center:"center_eOP_",left:"left_Abgd",right:"right_l_3w",chart:"chart_xZIc",optionLink:"optionLink_cYyU"}},90040:()=>{},84712:()=>{},32465:()=>{},51326:()=>{},1088:()=>{},49746:()=>{}}]);