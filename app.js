let network = null, data = [];
let nodes = [], lateNodes = [], edges = [], lateEdges = [], techTree = [];
let projects, techs, effects;
let techSidebar, searchBox;
let localizationData = {};
let documentSearchIndex;
let modules = {};
let lang;

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

function draw() {
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
    network = new vis.Network(container, data, options);

    data.nodes.add(lateNodes);

    let oldPositions = {};
    Object.values(network.body.nodes).forEach(node => {
        oldPositions[node.id] = [node.x, node.y];
    });

    data.edges.add(lateEdges);

    Object.keys(network.body.nodes).forEach(node => {
        network.nodesHandler.body.nodes[node].x = oldPositions[node][0];
        network.nodesHandler.body.nodes[node].y = oldPositions[node][1];
    });

    network.on('selectNode', nodeSelected);
    network.on('deselectNode', nodeDeselected);

    // Disable selecting edges
    network.on('click', ({ nodes, edges }) => {
        if (nodes.length == 0 && edges.length > 0) {
            network.setSelection({
                nodes: [],
                edges: []
            });
        }
    });

    let MIN_ZOOM = 0.35
    let MAX_ZOOM = 2.0
    let lastZoomPosition = { x: 0, y: 0 }
    network.on("zoom", function (params) {
        let scale = network.getScale()
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

    network.on("dragEnd", function (params) {
        lastZoomPosition = network.getViewPosition()
    });

    const handleFinishDrawing = () => {
        document.getElementById("loading").style.display = "none";
        network.off("afterDrawing", handleFinishDrawing);
    };
    network.on('afterDrawing', handleFinishDrawing)
}

function initSidebar() {
    if (!techSidebar) {
        techSidebar = ReactDOM.render(React.createElement(TechSidebar, {
            data: localizationData,
            techTree: techTree,
            effects: effects
        }), document.getElementById("sidebar"));
    }
}

function nodeSelected(event) {
    if (event.nodes.length !== 1) {
        return;
    }

    const selectedNodeId = event.nodes[0];
    const selectedNode = findTechByName(selectedNodeId);

    const sidebar = showSidebar();

    techSidebar.setState({ node: selectedNode });
    updateLocationHash(selectedNodeId);
}

function updateLocationHash(newHash) {
    history.replaceState(undefined, undefined, "#" + newHash);
}

function nodeDeselected() {
    hideSidebar();
}

function showSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.display = "block";
    return sidebar;
}

function hideSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.display = "none";
}

window.onload = init();
// window.onkeydown = function (e) {
//     if (e.keyCode == 70 && e.ctrlKey) {
//         e.preventDefault();
//     }
// }

function init() {
    const urlParams = new URLSearchParams(window.location.search);

    lang = urlParams.get("lang");
    if (lang == null) { lang = "en" };

    const localizationFiles = [
        "TITechTemplate." + lang,
        "TIProjectTemplate." + lang,
        "TIEffectTemplate." + lang,
        "TIBatteryTemplate." + lang,
        "TIDriveTemplate." + lang,
        "TIFactionTemplate." + lang,
        "TIGunTemplate." + lang,
        "TIHabModuleTemplate." + lang,
        "TIHeatSinkTemplate." + lang,
        "TILaserWeaponTemplate." + lang,
        "TIMagneticGunTemplate." + lang,
        "TIMissileTemplate." + lang,
        "TINationTemplate." + lang,
        "TIParticleWeaponTemplate." + lang,
        "TIPlasmaWeaponTemplate." + lang,
        "TIPowerPlantTemplate." + lang,
        "TIRadiatorTemplate." + lang,
        "TIShipArmorTemplate." + lang,
        "TIShipHullTemplate." + lang,
        "TIUtilityModuleTemplate." + lang,
    ];

    const fetchLocalizationPromises = localizationFiles.map(loc => fetch("data/" + loc).then(res => res.text()).then(text => parseText(text)));

    const moduleFiles = [
        {"path": "TIDriveTemplate.json", "type": "drive"},
        {"path": "TIGunTemplate.json", "type": "gun"},
        {"path": "TIHabModuleTemplate.json", "type": "hab"},
        {"path": "TIHeatSinkTemplate.json", "type": "heatsink"},
        {"path": "TILaserWeaponTemplate.json", "type": "laser"},
        {"path": "TIMagneticGunTemplate.json", "type": "magnetic"},
        {"path": "TIMissileTemplate.json", "type": "missile"},
        {"path": "TIParticleWeaponTemplate.json", "type": "particle"},
        {"path": "TIPlasmaWeaponTemplate.json", "type": "plasma"},
        {"path": "TIPowerPlantTemplate.json", "type": "power"},
        {"path": "TIRadiatorTemplate.json", "type": "radiator"},
        {"path": "TIShipArmorTemplate.json", "type": "armor"},
        {"path": "TIShipHullTemplate.json", "type": "hull"},
        {"path": "TIUtilityModuleTemplate.json", "type": "utility"},
        {"path": "TITechTemplate.json", "type": "tech", "callback": (() => {techs = modules.tech})},
        {"path": "TIProjectTemplate.json", "type": "project", "callback": (() => {projects = modules.project; projects.forEach(project => {project.isProject = true})})},
        {"path": "TIEffectTemplate.json", "type": "effect", "callback": (() => {effects = modules.effect})}
    ]

    const fetchModulePromises = moduleFiles.map(mod => fetch("data/" + mod.path).then(res => res.text()).then(text => parseModule(text, mod.type, mod.callback)));

    Promise.all([].concat(fetchLocalizationPromises, fetchModulePromises)).then(() => {
        hideSidebar();

        [].concat(techs, projects).forEach((tech) => {
            if (localizationData[tech.dataName] !== undefined)
                tech.displayName = localizationData[tech.dataName].displayName;
            else
                tech.displayName = tech.friendlyName;
        });

        parseDefaults(() => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                nodeSelected({ nodes: [hash] });
                network.selectNodes([hash]);
                network.focus(hash);
                network.moveTo({
                    scale: 1.0,
                });
            }
        });

        initSidebar();
    });
}

function parseModule(module, modType, callback) {
    let modData = JSON.parse(module);
    modData._modType = modType;
    
    modules[modType] = modData;

    if (callback)
        callback();
}

function findModule(moduleName) {
    let results = [];
    for (let modTypes in modules) {
        modules[modTypes].forEach(module => {
            if (module.requiredProjectName === moduleName)
                results.push(module);
        });
    }
    return results;
}

function initSearchBox() {
    searchBox = ReactDOM.render(React.createElement(Searchbox), document.getElementById("options"));

    documentSearchIndex = new FlexSearch.Document({
        document: {
            index: ["displayName"],
            store: ["displayName", "dataName"]
        },
        tokenize: "full"
    });
    techTree.forEach((tech, index) => {
        tech.id = index;
        documentSearchIndex.add(tech);
    });

    techSidebar.setState({ techTree: techTree, effects: effects });
}

function clearTree() {
    document.getElementById("loading").style.display = "block";

    if (data.nodes) data.nodes.clear();
    if (data.edges) data.edges.clear();

    nodes = [];
    lateNodes = [];

    edges = [];
    lateEdges = [];
}

function parseDefaults(callback) {
    clearTree();
    setTimeout(() => {
        techTree = techs.concat(projects);

        parseNode(techTree);
        data.nodes = new vis.DataSet(nodes);
        data.edges = new vis.DataSet(edges);

        draw();

        initSearchBox();

        if (callback)
            callback();
    }, 1);
}

function parseTechsOnly(callback) {
    clearTree();
    setTimeout(() => {
        parseNode(techs);
        data.nodes = new vis.DataSet(nodes);
        data.edges = new vis.DataSet(edges);

        draw();

        if (callback)
            callback();
    }, 1);
}

function parseSpecifiedNodes(group, callback) {
    clearTree();
    setTimeout(() => {
        parseNode(group, group.length < 20);
        data.nodes = new vis.DataSet(nodes);
        data.edges = new vis.DataSet(edges);

        draw();

        if (callback)
            callback();
    }, 1);
}

function parseText(text) {
    const lines = text.split("\n");

    lines.forEach(line => {
        line = line.split("//")[0].trim();

        const splitter = line.split(/=(.*)/s);
        const key = splitter[0];
        const value = splitter[1];

        const keySplit = key.split(".");
        const keyId = keySplit[2];

        if (!localizationData[keyId]) {
            localizationData[keyId] = {};
        }

        if (keySplit[1] == "displayName") {
            localizationData[keyId].displayName = value;
        } else if (keySplit[1] == "summary") {
            localizationData[keyId].summary = value;
        } else if (keySplit[1] == "description") {
            localizationData[keyId].description = value;
        }
    });
}

function getTechIconFile(techCategory) {
    if (techCategories[techCategory] !== undefined)
        return "icons/" + techCategories[techCategory].icon;
    return "";
}

function getTechBorderColor(techCategory) {
    if (techCategories[techCategory] !== undefined)
        return techCategories[techCategory].color;
    return "black";
}

function parseNode(nodeType, dumpAllEdges) {
    nodeType.forEach(tech => {
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
            level: determineLevel(tech, nodeType),
            color: { border: getTechBorderColor(tech.techCategory) }
        });

        let prereqCopy = [];

        if (tech.prereqs !== undefined) {
            tech.prereqs.forEach(prereq => {
                if (prereq === "" || !isValidNode(nodeType, prereq)) {
                    return;
                }
                prereqCopy.push(findTechByName(prereq));
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

        if (dumpAllEdges) {
            prereqCopy.forEach((prereq, index) => {
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
}

function isValidNode(validNodes, checkNode) {
    return validNodes.find(node => node.dataName === checkNode);
}

function determineLevel(tech, validNodes) {
    let validPrereqs = [];

    if (tech.prereqs !== undefined) {
        tech.prereqs.forEach(prereq => {
            if (prereq === "" || !isValidNode(validNodes, prereq))
                return;

            validPrereqs.push(prereq);
        })
    }

    if (validPrereqs.length === 0) {
        return 0;
    }

    let level = 0;
    validPrereqs.forEach(prereq => {
        let tech = findTechByName(prereq);
        if (!tech) {
            return;
        }
        level = Math.max(determineLevel(tech, validNodes) + 1, level);
    });
    return level;
}

function findTechByName(techName) {
    let tech = techTree.find(tech => tech.dataName === techName);
    return tech;
}
