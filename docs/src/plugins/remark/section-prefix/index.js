const visit = require('unist-util-visit');

const plugin = (options) => {
  const transformer = async (ast) => {
    const s = JSON.stringify(ast);
    if (s.includes('ooh')) {
      console.log('ast', JSON.stringify(ast, null, 2));
    }
    let number = 1;
    visit(ast, 'heading', (node) => {
      if (node.depth === 2 && node.children.length > 0) {
        node.children.unshift({
          type: 'text',
          value: `Section ${number}. `,
        });
        number++;
      }
    });
  };
  return transformer;
};

module.exports = plugin;
