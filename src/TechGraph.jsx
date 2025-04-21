import React, { useEffect, useRef, useCallback } from 'react';
import { parseNode, draw } from './techGraphRender';
import * as vis from "vis-network/standalone";

export const TechGraph = ({
    techTree,
    onNavigateToNode,
    navigatedToNode,
}) => {
    const networkRef = useRef(null);
    const renderCount = useRef(0);
    const techTreeRef = useRef(techTree);
    const onNavigateRef = useRef(onNavigateToNode);
    
    // Update refs when props change
    useEffect(() => {
        techTreeRef.current = techTree;
        onNavigateRef.current = onNavigateToNode;
    }, [techTree, onNavigateToNode]);
    
    // Memoize drawTree so it only changes if the refs change
    const drawTree = useCallback(() => {
        console.log("drawTree called");
        
        const { nodes, edges, lateNodes, lateEdges } = parseNode(techTreeRef.current, false);
        const data = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };

        networkRef.current = draw(
            techTreeRef.current, 
            data, 
            lateNodes, 
            lateEdges, 
            onNavigateRef.current
        );
    }, []);  // Empty dependency array since we use refs

    useEffect(() => {
        renderCount.current += 1;
        console.log(`Render count: ${renderCount.current}`);
    }, []);

    // Only run once at mount
    useEffect(() => {
        console.log("Initial effect running");
        const now = new Date();
        drawTree();
        console.log("TechGraph render time: " + (new Date() - now) + "ms");
    }, []); // Empty dependency array - only run once at mount

    useEffect(() => {
        if (navigatedToNode && networkRef.current) {
            networkRef.current.selectNodes([navigatedToNode.dataName]);
            networkRef.current.focus(navigatedToNode.dataName);
        }
    }, [navigatedToNode]);

    return (
        <div id="mynetwork"></div>
    );
};