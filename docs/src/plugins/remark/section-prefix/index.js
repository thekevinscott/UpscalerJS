const visit = require('unist-util-visit');

const plugin = (options) => {
  const transformer = async (ast) => {
    // console.log('ast', JSON.stringify(ast, null, 2));
    // let number = 1;
    // ast.children.unshift({
    //   type: 'text',
    //   value: 'WHAT UP BIG BOY'
    // })
    // ast.children.unshift({
    //   "type": "jsx",
    //   "value": "<StackBlitz persist=\"1\" url=\"/examples/basic\" params=\"embed=1&file=index.js&hideExplorer=1\" />",
    // });
    // const header = ast.children.shift();
    // ast.children.unshift(header);
    // visit(ast, 'heading', (node) => {
    //   if (node.depth === 2 && node.children.length > 0) {
    //     node.children.unshift({
    //       type: 'text',
    //       value: `Section ${number}. `,
    //     });
    //     number++;
    //   }
    // });
  };
  return transformer;
};

module.exports = plugin;
