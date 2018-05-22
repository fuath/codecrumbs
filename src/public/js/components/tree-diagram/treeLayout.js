import * as d3FlexTree from 'd3-flextree';
import { FILE_NODE_TYPE, DIR_NODE_TYPE, LAYOUT_CONFIG } from './constants';

export const getTreeLayout = (
    treeData,
    includeFileChildren,
    config = LAYOUT_CONFIG
) => {
    const layoutStructure = d3FlexTree.flextree({
        children: data => {
            if (includeFileChildren || data.type === DIR_NODE_TYPE) {
                return data.children;
            }

            return [];
        },
        nodeSize: node => [
            config.nodeSizeX,
            config.symbolWidth * node.data.name.length + config.nodeSizeY
        ],
        spacing: (nodeA, nodeB) => config.spacing
    });

    const tree = layoutStructure.hierarchy(treeData);
    return layoutStructure(tree);
};

export const getFilesList = layoutNodes => {
    const list = [];

    layoutNodes.each(node => {
        if (node.data && node.data.type === FILE_NODE_TYPE) {
            list.push(node);
        }
    });

    return list;
};