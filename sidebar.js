class TechSidebar extends React.Component {
    constructor(props) {
        super(props)
        this.state = { node: {}, isolated: false };
    }

    getReadableEffect(dataName) {
        const description = getLocalizationString("effect", dataName, "description");
        
        if (!description) {
            return "effect." + dataName + ".description";
        }
        
        const effectObj = this.findEffectByName(dataName);
        const effectVal = effectObj ? effectObj.value : 0;
        const effectStr = effectObj ? effectObj.strValue : "";

        var replaceEffectTag = function(match) {
            switch(match) {
            case "{0}":
                return effectVal.toString();
                
            case "{3}":
                return effectVal.toLocaleString(locale, {style: "percent"});
                
            case "{4}":
                return Math.abs((effectVal - 1.0)).toLocaleString(locale, {style: "percent"});
                
            case "{8}":
                return Math.abs((effectVal - 1.0)).toLocaleString(locale, {style: "percent"});
                
            case "{13}":
                return getReadable("region", effectStr, "displayName");
                
            case "{14}":
                return "our faction";
                
            case "{18}":
                return Math.abs((effectVal - 1.0)).toLocaleString(locale, {style: "percent"});
                
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
    
    getReadableSummary() {
        const node = this.state.node;

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
            return "";
        }

        if (summary.match(/<.*module>/)) {
            let summaryElements = [React.createElement(
                'p',
                null,
                summary.replace(/<.*module>/, "")
            )];
            const dataModules = this.findModule(node.dataName);
            dataModules.forEach(dataModule => {

                summaryElements.push(React.createElement(
                    'div',
                    null,
                    this.buildModuleDisplay(dataModule)
                ));
            });
            return summaryElements;
        } else {
            return React.createElement(
                'p',
                null,
                summary
            );
        }
    }
    
    findModule(moduleName) {
        let results = [];
        for (let modType in templateData) {
            templateData[modType].forEach(module => {
                if (module.requiredProjectName === moduleName)
                    results.push({"data": module, "type": modType});
            });
        }
        return results;
    }
    getIcon(dataModule) {
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

    findTechByName(techName) {
        return this.state.techTree.find(tech => tech.dataName === techName);
    }

    findEffectByName(effectName) {
        return this.state.effects.find(effect => effect.dataName === effectName);
    }

    findBlockingTechs(techToSearch) {
        return this.state.techTree.filter(tech => {if (tech.prereqs) {return tech.prereqs.find(prereq => prereq === techToSearch.dataName);}});
    }

    findPrereqTechs(techToSearch) {
        if (!techToSearch.prereqs) {
            return [];
        }
        else {
            return techToSearch.prereqs.filter(prereq => prereq !== "").map(prereq => {return this.state.techTree.find(tech => tech.dataName === prereq);});
        }
    }

    getAncestorTechs(techToSearch) {
        return this.findPrereqTechs(techToSearch)
            .reduce((arr, curr) => arr.concat(this.getAncestorTechs(curr)), [])
            .concat(this.findPrereqTechs(techToSearch));
    }

    getDescendentTechs(techToSearch) {
        return this.findBlockingTechs(techToSearch)
            .reduce((arr, curr) => arr.concat(this.getDescendentTechs(curr)), [])
            .concat(this.findBlockingTechs(techToSearch));
    }

    buildModuleDisplay(dataModule) {
        const node = this.state.node;
    
        let moduleDisplayElements = [];
        let icon = this.getIcon(dataModule.data);

        if (icon) {
            moduleDisplayElements.push(React.createElement(
                'img',
                { src: "./icons/" + icon + ".png" }
            ));
        }

        moduleDisplayElements.push(React.createElement(
            'p',
            null,
            getReadable(dataModule.type, dataModule.data.dataName, "description")
        ));
        moduleDisplayElements.push(React.createElement(
            'pre',
            null,
            JSON.stringify(dataModule.data, null, 2)
        ));

        return moduleDisplayElements;
    }

    render() {
        const node = this.state.node;

        if (!node || !node.dataName) {
            return React.createElement(
                "h2",
                null,
                "Error!"
            );
        }

        const isolateButton = React.createElement(
            MaterialUI.Button,
            {
                variant: "contained",
                onClick: event => {
                    let isolatedTree = this.getAncestorTechs(node).concat(this.getDescendentTechs(node)).concat(node);
                    isolatedTree = [...new Map(isolatedTree.map(v => [v.dataName, v])).values()];
                    parseSpecifiedNodes(isolatedTree, () => {
                        network.selectNodes([node.dataName]);
                        network.focus(node.dataName);
                        updateLocationHash(node.dataName);
                    });

                    this.setState({ isolated: true });
                },
                className: "topTechbarButton"
            },
            "See tree for this node"
        );

        const seeWholeTreeButton = React.createElement(
            MaterialUI.Button,
            {
                variant: "contained",
                onClick: event => {
                    this.setState({ isolated: false });
                    const showToggle = searchBox.state.showProjects;
                    if (showToggle) {
                        parseDefaults();
                    } else {
                        parseTechsOnly();
                    }
                },
                className: this.state.isolated ? "topTechbarButton" : "hideButton"
            },
            "See entire tree"
        );

        const doneButtonText = node.researchDone ? "Mark undone" : "Mark done";
        const markDone = React.createElement(
            MaterialUI.Button,
            {
                variant: "contained",
                onClick: event => {
                    if (node.researchDone) {
                        node.researchDone = false;
                    } else {
                        node.researchDone = true;
                        this.getAncestorTechs(node).forEach(tech => tech.researchDone = true);
                    }
                    this.setState({ node: node });
                },
                className: "topTechbarButton",
                color: node.researchDone ? "error" : "success"
            },
            doneButtonText
        );

        const summaryLabel = React.createElement(
            "h4",
            null,
            "Summary"
        );
        const summaryText = this.getReadableSummary();

        const researchCost = node.researchCost ? node.researchCost : 0;
        const ancestorTree = this.getAncestorTechs(node);
        const ancestorTreeIds = ancestorTree.map(o => o.id);
        const uniqueAncestorTree = ancestorTree.filter(({ id }, index) => !ancestorTreeIds.includes(id, index + 1));
        const ancestorTreeProcessed = uniqueAncestorTree.filter(tech => !tech.researchDone);

        const treeCost = uniqueAncestorTree.reduce((acc, curr) => acc + (curr.researchCost ? curr.researchCost : 0), 0)
            + (node.researchDone ? 0 : researchCost);
        const treeCostProcessed = ancestorTreeProcessed.reduce((acc, curr) => acc + (curr.researchCost ? curr.researchCost : 0), 0)
            + (node.researchDone ? 0 : researchCost);
        const treeCostString = treeCost == treeCostProcessed ? treeCost.toLocaleString() : treeCostProcessed.toLocaleString() + "/" + treeCost.toLocaleString();

        const costText = [React.createElement(
            'h4',
            null,
            "Cost: ",
            researchCost.toLocaleString()
        ), React.createElement(
            'h5',
            null,
            "Total Tree Cost: ",
            treeCostString
        )];
        
        let probabilities = [];
        
        if (node.isProject) {
            probabilities.push(React.createElement(
                'h4',
                null,
                "Base Availability Chance: ",
                (node.factionAvailableChance / 100).toLocaleString(locale, {style: "percent"})
            ));
            probabilities.push(React.createElement(
                'h5',
                null,
                "Initial Unlock Chance: ",
                (node.initialUnlockChance / 100).toLocaleString(locale, {style: "percent"})
            ));
            probabilities.push(React.createElement(
                'h5',
                null,
                "Monthly Unlock Chance Increase: ",
                (node.deltaUnlockChance / 100).toLocaleString(locale, {style: "percent"})
            ));
            probabilities.push(React.createElement(
                'h5',
                null,
                "Maximum Unlock Chance: ",
                (node.maxUnlockChance / 100).toLocaleString(locale, {style: "percent"})
            ));
        }

        let resourceLabel, resourceText;
        if (node.resourcesGranted && node.resourcesGranted.filter(resource => resource.resource !== "").length > 0) {
            let resourceString = "";
            node.resourcesGranted.filter(resource => resource.resource !== "").forEach(resource => {
                resourceString += resource.resource + " (" + resource.value + ")";
            });

            resourceLabel = React.createElement(
                "h4",
                null,
                "Resources Granted"
            );

            resourceText = React.createElement(
                "p",
                null,
                resourceString
            );
        }

        let org;
        if (node.orgGranted && node.orgGranted !== "") {
            org = React.createElement(
                "h4",
                null,
                "Org granted: ",
                node.orgGranted
            );
        }

        let prereqsText, prereqsList;
        if (node.prereqs && node.prereqs.filter(prereq => prereq !== "").length > 0) {
            let prereqElements = [];
            node.prereqs.filter(prereq => prereq !== "").forEach(prereq => {
                let tech = this.findTechByName(prereq);
                prereqElements.push(
                    React.createElement(
                        MaterialUI.Button,
                        {
                            key: prereq,
                            onClick: () => {
                                this.setState({ node: tech });
                                network.selectNodes([prereq]);
                                network.focus(prereq);
                                updateLocationHash(prereq);
                            },
                            variant: "contained",
                            className: "prereqButton" + (tech.researchDone ? " researchDone" : ""),
                            size: "small",
                            title: tech.isProject ? "Faction Project" : "Global Research",
                            'aria-label': tech ? tech.displayName + " "  + (tech.isProject ? "Faction Project" : "Global Research") : "",
                            color: tech.isProject ? "success" : "primary"
                        },
                        tech ? tech.displayName : ""
                    )
                );
            });


            prereqsText = React.createElement(
                "h4",
                null,
                "Required Research"
            );

            prereqsList = React.createElement(
                "div",
                { className: "hideBullets" },
                prereqElements
            );
        }

        let blockingText, blockingList;
        let blockingTechs = this.findBlockingTechs(node);
        if (blockingTechs.length > 0) {
            let blockerElements = [];
            blockingTechs.forEach(blocked => {
                blockerElements.push(
                    React.createElement(
                        MaterialUI.Button,
                        {
                            key: blocked.dataName,
                            onClick: () => {
                                this.setState({ node: blocked });
                                if (network.body.nodes[blocked.dataName]) {
                                    network.selectNodes([blocked.dataName]);
                                    network.focus(blocked.dataName);
                                    updateLocationHash(blocked.dataName);
                                }
                            },
                            variant: "contained",
                            className: "prereqButton",
                            size: "small",
                            title: blocked.isProject ? "Faction Project" : "Global Research",
                            'aria-label': blocked ? (blocked.displayName + " "  + (blocked.isProject ? "Faction Project" : "Global Research")) : "",
                            color: blocked.isProject ? "success" : "primary"
                        },
                        blocked.displayName
                    )

                );
            });


            blockingText = React.createElement(
                "h4",
                null,
                "Unblocks Research"
            );

            blockingList = React.createElement(
                "div",
                { className: "hideBullets" },
                blockerElements
            );
        }

        let milestones;
        if (node.requiredMilestone && node.requiredMilestone !== "") {
            milestones = React.createElement(
                "h4",
                null,
                "Milestones Needed: ",
                node.requiredMilestone
            );
        }

        let requiredObjectives;
        if (node.requiredObjectiveNames && node.requiredObjectiveNames.filter(objective => objective !== "").length > 0) {
            let objString = node.requiredObjectiveNames.filter(objective => objective !== "").join(", ");

            requiredObjectives = React.createElement(
                "h4",
                null,
                "Objectives Required: ",
                objString
            );
        }

        let factionReq;
        if (node.factionPrereq && node.factionPrereq.filter(faction => faction !== "").length > 0) {
            let factionString = node.factionPrereq.filter(faction => faction !== "")
                .map((faction) => getReadable("faction", faction, "displayName")).join(", ");

            factionReq = React.createElement(
                "h4",
                null,
                "Only Available to Factions: ",
                factionString
            );
        }

        let nationReq;
        if (node.requiresNation && node.requiresNation !== "") {
            nationReq = React.createElement(
                "h4",
                null,
                "Required Nations: ",
                getReadable("nation", node.requiresNation, "displayName")
            );
        }

        let regionReq;
        if (!nationReq && node.requiredControlPoint && node.requiredControlPoint.filter(region => region !== "").length > 0) {
            let regionString = node.requiredControlPoint.filter(region => region !== "").join(", ");

            regionReq = React.createElement(
                "h4",
                null,
                "Required Control Points: ",
                regionString
            );
        }

        let effectDescription, effectList;
        if (node.effects && node.effects.filter(effect => effect !== "").length > 0) {
            let effectElements = node.effects.filter(effect => effect !== "").map(effect => {
                return React.createElement(
                    "li",
                    { key: effect },
                    this.getReadableEffect(effect)
                );
            });

            effectDescription = React.createElement(
                "h4",
                null,
                "Effects"
            );
            effectList = React.createElement(
                "ul",
                null,
                effectElements
            );
        }

        let completionLabel, completionText, completionString;
        
        if (node.isProject) {
            completionString = getLocalizationString("project", node.dataName, "description");
        } else {
            completionString = getLocalizationString("tech", node.dataName, "description");
        }
        
        if (completionString) {
            completionLabel = React.createElement(
                'h4',
                null,
                "Completion Text"
            );

            completionText = React.createElement(
                'p',
                null,
                completionString
            );
        }

        return React.createElement(
            MaterialUI.Paper,
            { elevation: 3, id: "sidebar-react" },

            // Controls
            isolateButton,
            seeWholeTreeButton,
            markDone,

            // Heading
            React.createElement(
                "h2",
                null,
                node.displayName
            ),
            costText,
            probabilities,

            // Requirements
            prereqsText,
            prereqsList,
            blockingText,
            blockingList,
            milestones,
            requiredObjectives,
            factionReq,
            nationReq,
            regionReq,

            // Summary
            summaryLabel,
            summaryText,

            // Rewards
            resourceLabel,
            resourceText,
            org,

            effectDescription,
            effectList,

            // Completion
            completionLabel,
            completionText
        );
    }
}

