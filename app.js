let network = null, data = [];
let nodes = [], lateNodes = [], edges = [], lateEdges = [], techTree = [];
let projects, techs, effects;
let techSidebar, searchBox;
let localizationStrings = {};
let documentSearchIndex;
let templateData = {};
let lang, locale;

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

function getLocalizationString(type, dataName, field) {
    if (localizationStrings[type] && localizationStrings[type][dataName] && localizationStrings[type][dataName][field])
        return localizationStrings[type][dataName][field];

    return undefined;
}

function getReadable(type, dataName, field) {
    const text = getLocalizationString(type, dataName, field);

    if (text)
        return text;

    return type + "." + dataName + "." + field;
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
        techSidebar = ReactDOM.render(React.createElement(TechSidebar, {}), document.getElementById("sidebar"));
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
    // Get language and locale from query string
    const urlParams = new URLSearchParams(window.location.search);

    lang = urlParams.get("lang");

    if (lang == null)
        lang = "en";

    const locales = {
        "chs": "zh",
        "cht": "zh",
        "deu": "de",
        "en": "en",
        "esp": "es",
        "fr": "fr",
        "jpn": "ja",
        "pol": "pl",
        "por": "pt"
    };

    locale = locales[lang];

    // Fetch and parse localization files
    const localizationFiles = [
        {"filename": "TITechTemplate." + lang, "type": "tech"},
        {"filename": "TIProjectTemplate." + lang, "type": "project"},
        {"filename": "TIEffectTemplate." + lang, "type": "effect"},
        {"filename": "TIBatteryTemplate." + lang, "type": "battery"},
        {"filename": "TIDriveTemplate." + lang, "type": "drive"},
        {"filename": "TIFactionTemplate." + lang, "type": "faction"},
        {"filename": "TIGunTemplate." + lang, "type": "gun"},
        {"filename": "TIHabModuleTemplate." + lang, "type": "habmodule"},
        {"filename": "TIHeatSinkTemplate." + lang, "type": "heatsink"},
        {"filename": "TILaserWeaponTemplate." + lang, "type": "laserweapon"},
        {"filename": "TIMagneticGunTemplate." + lang, "type": "magneticgun"},
        {"filename": "TIMissileTemplate." + lang, "type": "missile"},
        {"filename": "TINationTemplate." + lang, "type": "nation"},
        {"filename": "TIParticleWeaponTemplate." + lang, "type": "particleweapon"},
        {"filename": "TIPlasmaWeaponTemplate." + lang, "type": "plasmaweapon"},
        {"filename": "TIRegionTemplate." + lang, "type": "region"},
        {"filename": "TIPowerPlantTemplate." + lang, "type": "powerplant"},
        {"filename": "TIRadiatorTemplate." + lang, "type": "radiator"},
        {"filename": "TIShipArmorTemplate." + lang, "type": "shiparmor"},
        {"filename": "TIShipHullTemplate." + lang, "type": "shiphull"},
        {"filename": "TIUtilityModuleTemplate." + lang, "type": "utilitymodule"}
    ];

    const fetchLocalizationPromises = localizationFiles.map(localization => fetch("data/" + localization.filename).then(res => res.text()).then(text => parselocalization(text, localization.type)));

    // Fetch and parse template files
    const templateFiles = [
        {"filename": "TIBilateralTemplate.json", "type": "bilateral"},
        {"filename": "TIDriveTemplate.json", "type": "drive"},
        {"filename": "TIEffectTemplate.json", "type": "effect"},
        {"filename": "TIGunTemplate.json", "type": "gun"},
        {"filename": "TIHabModuleTemplate.json", "type": "habmodule"},
        {"filename": "TIHeatSinkTemplate.json", "type": "heatsink"},
        {"filename": "TILaserWeaponTemplate.json", "type": "laserweapon"},
        {"filename": "TIMagneticGunTemplate.json", "type": "magneticgun"},
        {"filename": "TIMissileTemplate.json", "type": "missile"},
        {"filename": "TIParticleWeaponTemplate.json", "type": "particleweapon"},
        {"filename": "TIPlasmaWeaponTemplate.json", "type": "plasmaweapon"},
        {"filename": "TIPowerPlantTemplate.json", "type": "powerplant"},
        {"filename": "TIProjectTemplate.json", "type": "project"},
        {"filename": "TIRadiatorTemplate.json", "type": "radiator"},
        {"filename": "TIShipArmorTemplate.json", "type": "shiparmor"},
        {"filename": "TIShipHullTemplate.json", "type": "shiphull"},
        {"filename": "TITechTemplate.json", "type": "tech"},
        {"filename": "TIUtilityModuleTemplate.json", "type": "utilitymodule"}
    ]

    const fetchTemplatePromises = templateFiles.map(template => fetch("data/" + template.filename).then(res => res.text()).then(text => parseTemplate(text, template.type)));

    // Wait for file fetching and parsing to complete
    Promise.all([].concat(fetchLocalizationPromises, fetchTemplatePromises)).then(() => {
        hideSidebar();

        effects = templateData.effect;
        techs = templateData.tech;
        projects = templateData.project;
        
        projects.forEach(project => {project.isProject = true});

        [].concat(techs, projects).forEach((tech) => {
            if (tech.isProject) {
                tech.displayName = getReadable("project", tech.dataName, "displayName");
            } else {
                tech.displayName = getReadable("tech", tech.dataName, "displayName");
            }
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

function parseTemplate(text, templateType) {
    let data = JSON.parse(text);
    templateData[templateType] = data;
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

function parselocalization(text, localizationType) {
    const lines = text.split("\n");

    lines.forEach(line => {
        line = line.split("//")[0].trim();

        const splitter = line.split(/=(.*)/s);
        const key = splitter[0];
        const value = splitter[1];

        const keySplit = key.split(".");
        const keyId = keySplit[2];

        if (!localizationStrings[localizationType]) {
            localizationStrings[localizationType] = {};
        }

        if (!localizationStrings[localizationType][keyId]) {
            localizationStrings[localizationType][keyId] = {};
        }

        if (keySplit[1] == "displayName") {
            localizationStrings[localizationType][keyId].displayName = value;
        } else if (keySplit[1] == "summary") {
            localizationStrings[localizationType][keyId].summary = value;
        } else if (keySplit[1] == "description") {
            localizationStrings[localizationType][keyId].description = value;
        }
    });
}

function getTechIconFile(techCategory) {
    if (techCategories[techCategory])
        return "icons/" + techCategories[techCategory].icon;
    return "";
}

function getTechBorderColor(techCategory) {
    if (techCategories[techCategory])
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

        if (tech.prereqs) {
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

    if (tech.prereqs) {
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
