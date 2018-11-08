import * as d3FlexTree from 'd3-flextree';
import { FILE_NODE_TYPE, DIR_NODE_TYPE, FOLDER_OPEN_STATE } from 'utils/constants';
import { LAYOUT_CONFIG } from 'components/treeDiagram/store/constants';

export const getTreeLayout = (
  treeData,
  { includeFileChildren, config = LAYOUT_CONFIG, openedFolders, activeItemsMap, activeCodeCrumbs }
) => {
  const layoutStructure = d3FlexTree.flextree({
    children: data => {
      if (data.type === DIR_NODE_TYPE) {
        if (openedFolders[data.path] === FOLDER_OPEN_STATE.CLOSED) {
          return [];
        }

        if (openedFolders[data.path] === FOLDER_OPEN_STATE.OPEN_ACTIVE_CHILDREN_ONLY) {
          const filteredChildren = data.children.filter(child => activeItemsMap[child.path]);

          // TODO: hide .. for folders where it doesn't change anything
          data.childrenCollapsed = filteredChildren.length !== data.children.length;
          // TODO: refactor sorting of flow steps
          if (data.childrenCollapsed && activeCodeCrumbs) {
            if (
              filteredChildren.length > 1 &&
              filteredChildren.filter(
                i =>
                  i.type === FILE_NODE_TYPE &&
                  i.hasCodecrumbs &&
                  (i.children || []).find(({ params }) => activeCodeCrumbs[params.original])
              ).length === filteredChildren.length
            ) {
              filteredChildren.sort(
                (a, b) =>
                  b.children.find(({ params }) => activeCodeCrumbs[params.original]).params
                    .flowStep -
                  a.children.find(({ params }) => activeCodeCrumbs[params.original]).params.flowStep
              );
            }
          }

          return filteredChildren;
        }

        return data.children;
      }

      if (!includeFileChildren) {
        return [];
      }

      return !activeCodeCrumbs
        ? data.children
        : (data.children || []).filter(({ params }) => activeCodeCrumbs[params.original]);
    },
    nodeSize: node => {
      let nameLength = node.data.name.length;

      //cc: layout calc
      if (node.parent && node.data.type === DIR_NODE_TYPE) {
        const children = node.parent.children;
        nameLength = children.reduce((max, item) => {
          if (item.data.type === DIR_NODE_TYPE && item.data.name.length > max) {
            return item.data.name.length;
          }

          return max;
        }, 0);
      }

      return [config.nodeSizeX, nameLength * config.symbolWidth + config.nodeSizeY];
    },
    spacing: (nodeA, nodeB) => config.spacing
  });

  const tree = layoutStructure.hierarchy(treeData);
  return layoutStructure(tree);
};

export const getFileNodesMap = layoutNodes => {
  const map = {};

  layoutNodes.each(node => {
    if (node.data && node.data.type === FILE_NODE_TYPE) {
      map[node.data.path] = node;
    }
  });

  return map;
};

export const getFilesForCurrentCcFlow = ({
  codeCrumbedFlowsMap,
  selectedCrumbedFlowKey,
  filesMap
}) => {
  return Object.keys(codeCrumbedFlowsMap[selectedCrumbedFlowKey]).filter(filePath => {
    const steps = ((filesMap[filePath] && filesMap[filePath].children) || []).filter(
      ({ params }) => params.flow === selectedCrumbedFlowKey
    );
    return steps && steps.length;
  });
};

export const getCodeCrumbsMapForCurrentCcFlow = ({
  codeCrumbedFlowsMap,
  selectedCrumbedFlowKey,
  filesMap
}) => {
  const ccMap = {};

  Object.keys(codeCrumbedFlowsMap[selectedCrumbedFlowKey])
    .map(filePath => {
      return ((filesMap[filePath] && filesMap[filePath].children) || []).filter(
        ({ params }) => params.flow === selectedCrumbedFlowKey
      );
    })
    .filter(steps => steps.length)
    .forEach(steps => {
      steps.forEach(({ params }) => {
        ccMap[params.original] = 1;
      });
    });

  return ccMap;
};
