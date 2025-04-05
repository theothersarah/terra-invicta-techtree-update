import * as vis from "vis-network/standalone";

export function draw(techTree, data, lateNodes, lateEdges, onNavigateToNode) {
    const container = document.getElementById("mynetwork");
    const options = {
        layout: {
            hierarchical: {
                direction: "LR",
                parentCentralization: false,
                levelSeparation: 500
            },
            improvedLayout: false
        },
        interaction: { dragNodes: false },
        physics: {
            enabled: false
        },
        nodes: {
            borderWidth: 5,
            borderWidthSelected: 5,
            size: 20,
            color: {
                background: "#111",
                highlight: {
                    border: "blue",
                    background: "#111"
                }
            },
            font: {
                color: "black",
                face: "Roboto",
                size: 25,
                multi: 'html',
                bold: "25px Roboto black"
            },
            shapeProperties: {
                useBorderWithImage: true,
            },
            imagePadding: 5
        },
        edges: {
            color: {
                color: "gray",
                highlight: "blue"
            },
            width: 0.5,
            selectionWidth: 5,
            arrows: {
                to: {
                    enabled: true
                }
            }
        }
    };
    const network = new vis.Network(container, data, options);

    data.nodes.add(lateNodes);

    const oldPositions = {};
    Object.values(network.body.nodes).forEach(node => {
        oldPositions[node.id] = [node.x, node.y];
    });

    data.edges.add(lateEdges);

    Object.keys(network.body.nodes).forEach(node => {
        network.nodesHandler.body.nodes[node].x = oldPositions[node][0];
        network.nodesHandler.body.nodes[node].y = oldPositions[node][1];
    });

    network.on('selectNode', (e) => {
        if (e.nodes.length === 1) {
            const selectedNodeId = e.nodes[0];
            const selectedNode = findTechByName(techTree, selectedNodeId);
            onNavigateToNode(selectedNode);
        }
    });
    network.on('deselectNode', () => {
        onNavigateToNode(null);
    });

    // Disable selecting edges
    network.on('click', ({ nodes, edges }) => {
        if (nodes.length == 0 && edges.length > 0) {
            network.setSelection({
                nodes: [],
                edges: []
            });
        }
    });

    const MIN_ZOOM = 0.35
    const MAX_ZOOM = 2.0
    let lastZoomPosition = { x: 0, y: 0 }
    network.on("zoom", function () {
        const scale = network.getScale()
        if (scale <= MIN_ZOOM) {
            network.moveTo({
                position: lastZoomPosition,
                scale: MIN_ZOOM
            });
        }
        else if (scale >= MAX_ZOOM) {
            network.moveTo({
                position: lastZoomPosition,
                scale: MAX_ZOOM,
            });
        }
        else {
            lastZoomPosition = network.getViewPosition()
        }
    });
    network.moveTo({
        scale: 0.35,
    });

    network.on("dragEnd", function () {
        lastZoomPosition = network.getViewPosition()
    });

    return network;
}

const techCategories = {
    "Energy": {
        "icon": "tech_energy_icon.png",
        "color": "#ff7008"
    },
    "InformationScience": {
        "icon": "tech_info_icon.png",
        "color": "#e87474"
    },
    "LifeScience": {
        "icon": "tech_life_icon.png",
        "color": "#3cc478"
    },
    "Materials": {
        "icon": "tech_material_icon.png",
        "color": "#fbcb4b"
    },
    "MilitaryScience": {
        "icon": "tech_military_icon.png",
        "color": "#393c3c"
    },
    "SocialScience": {
        "icon": "tech_society_icon.png",
        "color": "#74bddc"
    },
    "SpaceScience": {
        "icon": "tech_space_icon.png",
        "color": "#6270d0"
    },
    "Xenology": {
        "icon": "tech_xeno_icon.png",
        "color": "#906cdc"
    }
}

export function getTechIconFile(techCategory) {
    if (techCategories[techCategory])
        return "icons/" + techCategories[techCategory].icon;
    return "";
}

export function getTechBorderColor(techCategory) {
    if (techCategories[techCategory])
        return techCategories[techCategory].color;
    return "black";
}

export function parseNode(techTree, dumpAllEdges) {
    const nodes = [];
    const edges = [];
    const lateNodes = [];
    const lateEdges = [];

    techTree.forEach(tech => {
        let nodeBucket = false;
        if (tech.repeatable || tech.endGameTech) {
            nodeBucket = lateNodes;
        } else {
            nodeBucket = nodes;
        }

        nodeBucket.push({
            label: "<b>" + tech.displayName + "</b>",
            id: tech.dataName,
            shape: "circularImage",
            image: getTechIconFile(tech.techCategory),
            level: determineLevel(tech, techTree),
            color: { border: getTechBorderColor(tech.techCategory) }
        });

        const prereqCopy = [];

        if (tech.prereqs) {
            tech.prereqs.forEach(prereq => {
                if (prereq === "" || !isValidNode(techTree, prereq)) {
                    return;
                }
                prereqCopy.push(findTechByName(techTree, prereq));
            });
        }

        prereqCopy.sort((a, b) => {
            const catA = a.techCategory === tech.techCategory;
            const catB = b.techCategory === tech.techCategory;
            if (catA && !catB) {
                return -1;
            }
            if (catB && !catA) {
                return 1;
            }

            return b.researchCost - a.researchCost;
        });

        if (tech.altPrereq0) {
            const prereq = tech.altPrereq0;
            if (prereq !== "" && isValidNode(techTree, prereq)) {
                prereqCopy.push(findTechByName(techTree, prereq));
            }
        }

        if (dumpAllEdges) {
            prereqCopy.forEach((prereq) => {
                edges.push({
                    "from": prereq.dataName,
                    "to": tech.dataName
                });
            });

            return;
        }

        if (prereqCopy.length > 0) {
            edges.push({
                "from": prereqCopy[0].dataName,
                "to": tech.dataName
            });
        }

        prereqCopy.forEach((prereq, index) => {
            if (index !== -1) {
                lateEdges.push({
                    "from": prereq.dataName,
                    "to": tech.dataName
                });
            }
        });
    });
    return {
        nodes,
        edges,
        lateNodes,
        lateEdges
    }
}

export function isValidNode(validNodes, checkNode) {
    return validNodes.find(node => node.dataName === checkNode);
}

export function determineLevel(tech, techTree) {
    const validPrereqs = [];

    if (tech.prereqs) {
        tech.prereqs.forEach(prereq => {
            if (prereq === "" || !isValidNode(techTree, prereq))
                return;

            validPrereqs.push(prereq);
        })
    }

    if (validPrereqs.length === 0) {
        return 0;
    }

    let level = 0;
    validPrereqs.forEach(prereq => {
        const tech = findTechByName(techTree, prereq);
        if (!tech) {
            return;
        }
        level = Math.max(determineLevel(tech, techTree) + 1, level);
    });
    return level;
}

export function findTechByName(techTree, techName) {
    const tech = techTree.find(tech => tech.dataName === techName);
    return tech;
}
