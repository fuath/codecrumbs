const babylon = require('@babel/parser');
const babelTraverse = require('@babel/traverse');

const astParseConfig = require('../../../shared/astParse').config;
const NO_TRAIL_FLOW = require('../../../shared/constants').NO_TRAIL_FLOW;

const CRUMB = 'codecrumb',
  CRUMB_SHORT_HANDLER = 'cc';

const parseCodecrumbComment = (node = {}) => {
  const comment = node.value || '';

  const cc = { original: comment };
  try {
    const afterAlias = comment.split(':')[1];
    if (afterAlias) {
      const params = afterAlias.split(';');
      //check if has flow marker
      if (params[0] && params[0][0] === '#') {
        const flowParams = params[0].substr(1).split('#');
        cc.flow = flowParams[0];
        cc.flowStep = +flowParams[1];
        cc.name = params[1];
        cc.details = params[2];
      } else {
        cc.name = params[0];
        cc.details = params[1];
        cc.flow = NO_TRAIL_FLOW;
      }
    }
  } catch (e) {
    console.error('Parameters parsing failed: ', e);
  }

  return cc;
};

const isCodecrumb = (node = {}) => {
  const comment = node.value || '';
  return comment.startsWith(CRUMB) || comment.startsWith(CRUMB_SHORT_HANDLER);
};

const getCrumbs = (fileCode, path) => {
  let ast = {};
  const crumbsList = [];

  try {
    ast = babylon.parse(fileCode, astParseConfig);

    // TODO: ast has comments array, maybe use it
    babelTraverse.default(ast, {
      enter(path) {
        const node = path.node;
        if (!node || !(node.leadingComments || node.trailingComments)) return;

        const leadingComment = node.leadingComments
          ? node.leadingComments[node.leadingComments.length - 1]
          : null;

        let trailingComment = node.trailingComments ? node.trailingComments[0] : null;

        if (trailingComment && trailingComment.loc.start.line !== node.loc.start.line) {
          trailingComment = null;
        }

        [leadingComment, trailingComment].forEach(comment => {
          if (comment && isCodecrumb(comment)) {
            const params = parseCodecrumbComment(comment);

            const loc = comment.loc.start;
            crumbsList.push({
              name: params.name || '', //TODO: check, can be bug with layout calc
              displayLoc: `#${loc.line}`,
              crumbedLineNode: node,
              crumbNode: comment,
              params
            });
          }
        });
      }
    });

    return crumbsList;
  } catch (e) {
    console.log(path, e);
    return crumbsList;
  }
};

module.exports = {
  getCrumbs
};