import React, { useEffect, useState } from 'react';
import { parseNode, draw } from './techGraphRender';
import * as vis from "vis-network/standalone";

export const TechGraph = ({
    techDb,
    onNavigateToNode,
    navigatedToNode,
}) => {
    const [network, setNetwork] = useState(null);

    function drawTree() {
        const { nodes, edges, lateNodes, lateEdges } = parseNode(techDb, false);
        const data = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };

        setNetwork(draw(techDb, data, lateNodes, lateEdges, onNavigateToNode));
    }

    useEffect(() => {
        drawTree();
    }, [techDb]);

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
