import React, { useEffect, useState } from 'react';
import { parseNode, draw } from './techGraphRender';
import * as vis from "vis-network/standalone";

export const TechGraph = ({
    techTree,
    onNavigateToNode,
    navigatedToNode,
}) => {
    const [network, setNetwork] = useState(null);

    function drawTree() {
        const { nodes, edges, lateNodes, lateEdges } = parseNode(techTree, false);
        const data = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };

        setNetwork(draw(techTree, data, lateNodes, lateEdges, onNavigateToNode));
    }

    useEffect(() => {
        drawTree();
    }, [techTree]);

    useEffect(() => {
        if (navigatedToNode) {
            network.selectNodes([navigatedToNode.dataName]);
            network.focus(navigatedToNode.dataName);
        }
    }, [navigatedToNode]);

    return (
        <div id="mynetwork"></div>
    );
};
