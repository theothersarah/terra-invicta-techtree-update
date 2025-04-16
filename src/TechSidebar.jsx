import React, { useState } from "react";
import { Button, Paper } from "@mui/material";
import { findBlockingTechs, getAncestorTechs } from './utils.js';

export function TechSidebar({
    templateData,
    getLocalizationString,
    getReadable,
    language,
    techTree,
    onNavigateToNode,
    navigatedToNode,
    handleIsolatedChanged,
}) {    
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

    const locale = locales[language];
    const effects = templateData.effect;
    const [isolated, setIsolated] = useState(false);

    function getReadableEffect(dataName) {
        const description = getLocalizationString("effect", dataName, "description");

        if (!description) {
            return "effect." + dataName + ".description";
        }

        if (description.match(/<skip.*>/)) {
            return "Hidden effect: " + dataName;
        }

        const effectObj = findEffectByName(dataName);
        const effectVal = effectObj ? effectObj.value : 0;
        const effectStr = effectObj ? effectObj.strValue : "";

        var replaceEffectTag = function (match) {
            switch (match) {
                case "{0}":
                    return effectVal.toString();

                case "{3}":
                    return effectVal.toLocaleString(locale, { style: "percent" });

                case "{4}":
                    return Math.abs((effectVal - 1.0)).toLocaleString(locale, { style: "percent" });

                case "{8}":
                    return Math.abs((effectVal - 1.0)).toLocaleString(locale, { style: "percent" });

                case "{13}":
                    return getReadable("region", effectStr, "displayName");

                case "{14}":
                    return "our faction";

                case "{18}":
                    return Math.abs((1.0 / effectVal - 1.0)).toLocaleString(locale, { style: "percent" });

                case "{19}":
                    return (-effectVal).toString();

                default:
                    return match;
            }
        };

        const effectTemplateString = description
            .replace(/^-/g, "")
            .replace('<color=#FFFFFFFF><sprite name="mission_control"></color>', "Mission Control")
            .replace('<color=#FFFFFFFF><sprite name="water"></color>', "Water")
            .replace('<color=#FFFFFFFF><sprite name="volatiles"></color>', "Volatiles")
            .replace('<color=#FFFFFFFF><sprite name="metal"></color>', "Metals")
            .replace('<color=#FFFFFFFF><sprite name="metal_noble"></color>', "Noble Metals")
            .replace('<color=#FFFFFFFF><sprite name="radioactive"></color>', "Fissiles")
            .replace(/\{[0-9]*\}/g, replaceEffectTag.bind(this));

        return effectTemplateString;
    }

    function getReadableSummary() {
        let summary;

        if (node.isProject) {
            summary = getLocalizationString("project", node.dataName, "summary");

        } else {
            summary = getLocalizationString("tech", node.dataName, "summary");
        }

        if (!summary) {
            if (node.isProject) {
                return "project." + node.dataName + ".summary";
            } else {
                return "tech." + node.dataName + ".summary";
            }
        }

        if (summary.match(/<.*module>/)) {
            return "Unlocks one or more modules.";
        } else {
            return React.createElement(
                'p',
                null,
                summary
            );
        }
    }

    function getReadableClaim(claim) {
        const nationName = getReadable("nation", claim.nation1, "displayName");
        const regionName = getReadable("region", claim.region1, "displayName");

        if (!nationName || !regionName) {
            return null;
        }

        return `${nationName} gains a claim on ${regionName}`;
    }

    function getReadableAdjacency(adjacency) {
        const region1Name = getReadable("region", adjacency.region1, "displayName");
        const region2Name = getReadable("region", adjacency.region2, "displayName");
        if (adjacency.friendlyOnly) {
            return `${region1Name} and ${region2Name} are now considered to be adjacent for friendly traffic`;
        } else {
            return `${region1Name} and ${region2Name} are now considered to be adjacent`;
        }
    }

    // not used
    // function getObjectiveNames(objectiveName) {
    //     let objString;
    //     const objLocStrings = getReadable("objective", objectiveName, "displayName");

    //     if (typeof objLocStrings === "string") {
    //         objString = objLocStrings;
    //     } else {
    //         const objStrings = [];
    //         Object.entries(objLocStrings).forEach(x => {
    //             objStrings.push(x[1] + " (" + getReadable("faction", x[0], "displayName") + ")");
    //         });
    //         objString = objStrings.join(", ");
    //     }

    //     return objString;
    // }

    function findModules(projectName) {
        const results = [];
        const modTypes = ["battery", "drive", "gun", "habmodule", "heatsink", "laserweapon", "magneticgun", "missile", "particleweapon", "plasmaweapon", "powerplant", "radiator", "shiparmor", "shiphull", "utilitymodule"];
        modTypes.forEach(modType => {
            templateData[modType].forEach(module => {
                if (module.requiredProjectName === projectName)
                    results.push({ "data": module, "type": modType });
            });
        });
        return results;
    }

    function getIcon(dataModule) {
        if (dataModule.iconResource) {
            return dataModule.iconResource;
        }
        else if (dataModule.baseIconResource) {
            return dataModule.baseIconResource;
        }
        else if (dataModule.stationIconResource) {
            return dataModule.stationIconResource;
        }
        else {
            return undefined;
        }
    }

    function findTechByName(techName) {
        return techTree.find(tech => tech.dataName === techName);
    }

    function findEffectByName(effectName) {
        return effects.find(effect => effect.dataName === effectName);
    }

    function getLeaderName(string) {
        let faction = string.slice(1, -1);
        faction = faction.replace("Leader", "Council");
        faction = faction[0].toUpperCase() + faction.slice(1);
        return getLocalizationString("faction", faction, "fullLeader");
    }

    const buildModuleDisplay = (dataModule) => {
        const icon = getIcon(dataModule.data);
        return <div>
            {icon && <img src={"./icons/" + icon + ".png"} />}
            <p>{getReadable(dataModule.type, dataModule.data.dataName, "description")}</p>
            <pre>{JSON.stringify(dataModule.data, null, 2)}</pre>
        </div>
    };

    const node = navigatedToNode;

    if (!node) {
        return <div></div>
    }

    // Calculate costs and research status
    const researchCost = node.researchCost || 0;
    const ancestorTree = getAncestorTechs(techTree, node);
    if (!ancestorTree || ancestorTree.some(tech => !tech)) {
        // we are in tech only mode but sidebar is opened on a project
        return <div></div>
    }

    const ancestorTreeIds = ancestorTree.map(o => o.id);
    const uniqueAncestorTree = ancestorTree.filter(({ id }, index) => !ancestorTreeIds.includes(id, index + 1));
    const ancestorTreeProcessed = uniqueAncestorTree.filter(tech => !tech.researchDone);

    const treeCost = uniqueAncestorTree.reduce((acc, curr) => acc + (curr.researchCost ? curr.researchCost : 0), 0)
        + (node.researchDone ? 0 : researchCost);
    const treeCostProcessed = ancestorTreeProcessed.reduce((acc, curr) => acc + (curr.researchCost ? curr.researchCost : 0), 0)
        + (node.researchDone ? 0 : researchCost);

    const treeCostString = treeCost === treeCostProcessed ?
        treeCost.toLocaleString() :
        `${treeCostProcessed.toLocaleString()}/${treeCost.toLocaleString()}`;

    const techSorter = (a, b) => {
        // non-project techs first
        if (a.isProject && !b.isProject) {
            return 1;
        }
        if (!a.isProject && b.isProject) {
            return -1;
        }
        // sort by display name
        return a.displayName.localeCompare(b.displayName);
    };
    
    const handleResearchToggle = () => {
        if (node.researchDone) {
            node.researchDone = false;
        } else {
            node.researchDone = true;
            getAncestorTechs(techTree, node).forEach(tech => tech.researchDone = true);
        }
        onNavigateToNode({
            ...node
        });
    };

    // Render prerequisites section
    const renderPrerequisites = () => {
        const prereqNames = node.prereqs?.filter(prereq => prereq !== "") || [];

        if (prereqNames.length === 0) {
            return null;
        }

        const prereqElements = prereqNames
            .map(prereq => {
                const tech = findTechByName(prereq);
                return (
                    <Button
                        key={`prereq-${tech.displayName}`}
                        onClick={() => onNavigateToNode(tech)}
                        variant="contained"
                        className={`prereqButton${tech.researchDone ? " researchDone" : ""}`}
                        size="small"
                        title={tech.isProject ? "Faction Project" : "Global Research"}
                        aria-label={tech ? `${tech.displayName} ${tech.isProject ? "Faction Project" : "Global Research"}` : ""}
                        color={tech.isProject ? "success" : "primary"}
                    >
                        {tech ? tech.displayName : ""}
                    </Button>
                );
            });

        // Handle alternate prerequisites
        if (node.altPrereq0 && node.altPrereq0 !== "") {
            const prereq = node.altPrereq0;
            const tech = findTechByName(prereq);
            const altButton = (
                <Button
                    key={`alt-${tech.displayName}`}
                    onClick={() => onNavigateToNode(tech)}
                    variant="contained"
                    className={`prereqButton${tech.researchDone ? " researchDone" : ""}`}
                    size="small"
                    title={tech.isProject ? "Faction Project" : "Global Research"}
                    aria-label={tech ? `${tech.displayName} ${tech.isProject ? "Faction Project" : "Global Research"}` : ""}
                    color={tech.isProject ? "success" : "primary"}
                >
                    {tech ? tech.displayName : ""}
                </Button>
            );

            const orText = <b key={"or"} className="prereqButton">or</b>;
            const breakElement = <br key={"br"} />;
            const andText = <b key={"and"} className="prereqButton">and</b>;

            if (prereqElements.length > 1) {
                prereqElements.splice(1, 0, orText, altButton, breakElement, andText);
            } else {
                prereqElements.splice(1, 0, orText, altButton);
            }
        }

        return (
            <>
                <h4>Required Research</h4>
                <div className="hideBullets">{prereqElements}</div>
            </>
        );
    };

    // Render blocking techs section
    const renderBlockingTechs = () => {
        const blockingTechs = findBlockingTechs(techTree, node);
        if (blockingTechs.length === 0) {
            return null;
        }

        blockingTechs.sort(techSorter);

        const blockerElements = blockingTechs.map(blocked => (
            <Button
                key={`blocker-${blocked.dataName}`}
                onClick={() => {
                    onNavigateToNode(blocked);
                }}
                variant="contained"
                className="prereqButton"
                size="small"
                title={blocked.isProject ? "Faction Project" : "Global Research"}
                aria-label={blocked ? `${blocked.displayName} ${blocked.isProject ? "Faction Project" : "Global Research"}` : ""}
                color={blocked.isProject ? "success" : "primary"}
            >
                {blocked.displayName}
            </Button>
        ));

        return (
            <>
                <h4>Unblocks Research</h4>
                <div className="hideBullets">{blockerElements}</div>
            </>
        );
    };

    const renderAdjacencies = () => {
        const adjacencies = templateData["bilateral"].filter(adjaceny => adjaceny.projectUnlockName == node.dataName && adjaceny.relationType == "PhysicalAdjacency");
        if (adjacencies.length === 0) {
            return null;
        }
        const adjacencyElements = adjacencies.map(adjacency => (
            <li key={`adj-${JSON.stringify(adjacency)}`}>{getReadableAdjacency(adjacency)}</li>
        ));
        return (
            <>
                <h4>Adjacencies</h4>
                <ul>{adjacencyElements}</ul>
            </>
        );
    };

    const renderResources = () => {
        const resourcesGranted = node.resourcesGranted?.filter(resource => resource.resource !== "") ?? [];
        if (resourcesGranted.length === 0) {
            return null;
        }

        const resourceElements = node.resourcesGranted
            .filter(resource => resource.resource !== "")
            .map(resource => (
                <li key={`res-${resource.resource}`}>{resource.resource} {resource.value}</li>
            ));
        return (
            <>
                <h4>Resources Granted</h4>
                <ul>{resourceElements}</ul>
            </>
        );
    };

    const renderOrg = () => {
        if (!node.orgGranted) {
            return null;
        }
        const org = node.orgGranted;
        const displayName = getLocalizationString("org", org, "displayName");
        return (
            <>
                <h4>Org Granted</h4>
                <p>{displayName ? displayName : org}</p>
            </>
        );
    };

    const renderOrgsMarket = () => {
        const orgMarket = templateData["org"]?.filter(org => org.requiredTechName == node.dataName) ?? [];
        if (orgMarket.length === 0) {
            return null;
        }
        const orgMarketElements = orgMarket.map(org => {
            const displayName = getLocalizationString("org", org.dataName, "displayName");
            return (
                <li key={`org-${org.dataName}`}>{displayName ? displayName : org.dataName}</li>
            );
        });
        return (
            <>
                <h4>Orgs Added to Market</h4>
                <ul>{orgMarketElements}</ul>
            </>
        );
    };

    const renderEffects = () => {
        if (!node.effects || node.effects.filter(effect => effect !== "").length === 0) {
            return null;
        }

        const effectElements = node.effects
            .filter(effect => effect !== "")
            .map(effect => (
                <li key={`eff-${effect}`}>{getReadableEffect(effect)}</li>
            ));

        return (
            <>
                <h4>Effects</h4>
                <ul>{effectElements}</ul>
            </>
        );
    };
    
    const renderTraits = () => {
        const traits = templateData["trait"]?.filter(aug => aug.projectDataName == node.dataName) ?? [];
        if (traits.length === 0) {
            return null;
        }
        const traitElements = traits.map(trait => {
            const displayName = getLocalizationString("trait", trait.dataName, "displayName");
            return (
                <li key={`trait-${trait.dataName}`}>{displayName ? displayName : trait.dataName}</li>
            );
        });
        return (
            <>
                <h4>Councilor Traits Available</h4>
                <ul>{traitElements}</ul>
            </>
        );
    };

    const renderModules = () => {
        const modules = node.isProject ? findModules(node.dataName) : [];
        if (modules.length === 0) {
            return null;
        }
        const moduleElements = modules.map(module => {
            const displayName = getLocalizationString(module.type, module.data.dataName, "displayName");
            return (
                <div key={`mod-${module.data.dataName}`}>
                    <br />
                    {displayName ? displayName : module.data.dataName}
                    {buildModuleDisplay(module)}
                </div>
            );
        });
        return (
            <>
                <h4>Modules Unlocked</h4>
                {moduleElements}
            </>
        );
    };

    // Render claims section
    const renderClaims = () => {
        if (!node.isProject) return null;

        const claims = templateData["bilateral"]?.filter(
            claim => claim.projectUnlockName === node.dataName && claim.relationType === "Claim"
        ) || [];

        if (claims.length === 0) return null;

        const claimsElements = claims.flatMap(claim => {
            const text = getReadableClaim(claim);
            if (!text) {
                return [];
            }
            return [
                <li key={`claim-${JSON.stringify(claim)}`}>{text}</li>
            ];
        });

        return (
            <>
                <h4>Claims</h4>
                <ul>{claimsElements}</ul>
            </>
        );
    };

    // Main render
    return (
        <div id="sidebar">
            <Paper elevation={3} id="sidebar-react">
                {/* Controls */}
                <Button
                    variant="contained"
                    onClick={() => {
                        setIsolated(!isolated);
                        handleIsolatedChanged(!isolated);
                    }}
                    className="topTechbarButton"
                >
                    {/* See tree for this node */}
                    {/* (!isolated ? "See tree for this node" : "See entire tree") */}
                    {isolated ? "See entire tree" : "See tree for this node"}
                </Button>

                <Button
                    variant="contained"
                    onClick={handleResearchToggle}
                    className="topTechbarButton"
                    color={node.researchDone ? "error" : "success"}
                >
                    {node.researchDone ? "Mark undone" : "Mark done"}
                </Button>

                {/* Heading */}
                <h2>{node.displayName}</h2>

                {/* Cost information */}
                <h4>Cost: {researchCost.toLocaleString()}</h4>
                <h5>Total Tree Cost: {treeCostString}</h5>

                {/* Project-specific probabilities */}
                {node.isProject && (
                    <>
                        <h4>Base Availability Chance: {(node.factionAvailableChance / 100).toLocaleString(locale, { style: "percent" })}</h4>
                        <h5>Initial Unlock Chance: {(node.initialUnlockChance / 100).toLocaleString(locale, { style: "percent" })}</h5>
                        <h5>Monthly Unlock Chance Increase: {(node.deltaUnlockChance / 100).toLocaleString(locale, { style: "percent" })}</h5>
                        <h5>Maximum Unlock Chance: {(node.maxUnlockChance / 100).toLocaleString(locale, { style: "percent" })}</h5>
                    </>
                )}

                {/* Faction requirements */}
                {node.isProject && node.factionAlways && (
                    <h5>Always available to {getReadable("faction", node.factionAlways, "displayName")}</h5>
                )}

                {node.isProject && node.factionPrereq && node.factionPrereq.filter(faction => faction !== "").length > 0 && (
                    <h5>
                        Only Available to {
                            node.factionPrereq
                                .filter(faction => faction !== "")
                                .map(faction => getReadable("faction", faction, "displayName"))
                                .join(", ")
                        }
                    </h5>
                )}

                {/* Requirements */}
                {renderPrerequisites()}
                {renderBlockingTechs()}

                {/* Other requirements */}
                {node.isProject && node.requiredMilestone && node.requiredMilestone !== "" && (
                    <h4>Milestone Needed: {getReadable("objective", node.requiredMilestone, "MilestoneFulfilled")}</h4>
                )}

                {/* Special flags */}
                {!node.isProject && node.endGameTech && <h4>Endgame tech</h4>}
                {node.isProject && node.oneTimeGlobally && <h4>Completable once globally</h4>}
                {node.isProject && node.repeatable && <h4>Repeatable</h4>}

                <h4>Summary</h4>
                {getReadableSummary()}

                {/* Rewards */}
                {renderClaims()}
                {renderAdjacencies()}
                {renderResources()}
                {renderOrg()}
                {renderOrgsMarket()}
                {renderEffects()}
                {renderTraits()}
                {renderModules()}

                {/* Completion text */}
                {node.isProject ? (
                    <>
                        {getLocalizationString("project", node.dataName, "description") && (
                            <>
                                <h4>Completion Text</h4>
                                <p dangerouslySetInnerHTML={{ __html: getLocalizationString("project", node.dataName, "description") }} />
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {getLocalizationString("tech", node.dataName, "quote") && (
                            <>
                                <h4>Completion Quote</h4>
                                <p dangerouslySetInnerHTML={{
                                    __html: getLocalizationString("tech", node.dataName, "quote").replace(/\{(.*?)\}/g, getLeaderName)
                                }} />
                            </>
                        )}
                        {getLocalizationString("tech", node.dataName, "description") && (
                            <>
                                <h4>Completion Text</h4>
                                <p dangerouslySetInnerHTML={{ __html: getLocalizationString("tech", node.dataName, "description") }} />
                            </>
                        )}
                    </>
                )}
            </Paper>
        </div>
    );
}