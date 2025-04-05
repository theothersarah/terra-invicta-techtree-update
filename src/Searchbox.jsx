import React, { useState, useRef, useEffect } from 'react';
import { Paper, Autocomplete, TextField, FormControlLabel, Switch } from '@mui/material';
import FlexSearch from 'flexsearch';

export const Searchbox = ({
    techTree,
    setShowProjects,
    onNavigateToNode,
    getLocalizationString,
    templateData,
}) => {
    const [results, setResults] = useState([]);
    const [documentSearchIndex, setDocumentSearchIndex] = useState(null);
    const [fullText, setFullText] = useState(false);

    const updateDocumentSearchIndex = (techTree) => {
        const documentSearchIndex = new FlexSearch.Document({
            document: {
                index: ["displayName", "fullText"],
                store: ["displayName"]
            },
            tokenize: "full"
        });

        techTree.forEach((node) => {
            let searchData = {
                "id": node.id,
                "displayName": node.displayName
            };
            
            let summaryText;
            if (node.isProject) {
                summaryText = getLocalizationString("project", node.dataName, "summary");
            } else {
                summaryText = getLocalizationString("tech", node.dataName, "summary");
            }
            
            let effectsText;
            if (node.effects && node.effects.filter(effect => effect !== "").length > 0) {
                effectsText = node.effects.filter(effect => effect !== "").map(effect => getLocalizationString("effect", effect, "description"));
            }
            
            const modulesText = [];
            if (node.isProject) {
                const modTypes = ["battery", "drive", "gun", "habmodule", "heatsink", "laserweapon", "magneticgun", "missile", "particleweapon", "plasmaweapon", "powerplant", "radiator", "shiparmor", "shiphull", "utilitymodule"];
                modTypes.forEach(modType => {
                    templateData[modType].forEach(module => {
                        if (module.requiredProjectName === node.dataName)
                            modulesText.push(getLocalizationString(modType, module.dataName, "displayName"));
                    });
                });
            }
            
            const claimsText = [];
            if (node.isProject) {
                let claimsList = templateData["bilateral"].filter(claim => claim.projectUnlockName == node.dataName && claim.relationType == "Claim");
                if (claimsList.length > 0) {
                    claimsText.push("gains a claim on");
                    
                    claimsList.map(claim => {
                        claimsText.push(getLocalizationString("nation", claim.nation1, "displayName"));
                        claimsText.push(getLocalizationString("region", claim.region1, "displayName"));
                    });
                }
            }
            
            searchData.fullText = [node.displayName, summaryText, effectsText, modulesText, claimsText].join(" ");
            documentSearchIndex.add(searchData);
        });

        setDocumentSearchIndex(documentSearchIndex);
    }

    useEffect(() => {
        updateDocumentSearchIndex(techTree);
    }, [techTree]);

    const searchInputRef = useRef(null);

    const handleInputChange = (_, value) => {
        if (!value) {
            setResults([]);
            return;
        }

        const searchResults = documentSearchIndex.search(value, { pluck: (fullText ? "fullText" : "displayName"), enrich: true })
            .map(result => result.doc.displayName);

        setResults(searchResults);
    };

    const handleChange = (_, value) => {
        if (!value) return;

        const navigateToNode = techTree.find(tech => tech.displayName === value);

        if (navigateToNode) {
            onNavigateToNode(navigateToNode);
        }
    };

    // TODO: handle autocomplete on toggle
    const handleProjectsToggle = (event) => {
        const showToggle = event.target.checked;
        setShowProjects(showToggle);
    };

    return (
        <div id="options">
            <Paper elevation={3} id="searchBox">
                <Autocomplete
                    options={results}
                    freeSolo
                    onInputChange={handleInputChange}
                    onChange={handleChange}
                    filterOptions={x => x}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Search"
                            inputRef={searchInputRef}
                            autoFocus
                        />
                    )}
                />
                <FormControlLabel
                    id="showProjects"
                    label="Show Projects"
                    control={
                        <Switch
                            defaultChecked
                            onChange={handleProjectsToggle}
                        />
                    }
                />
                <FormControlLabel
                    id="fullText"
                    label="Full Text Search"
                    control={
                        <Switch
                            onChange={(e) => {
                                setFullText(e.target.checked);
                                searchInputRef.current.focus();
                            }}
                        />
                    }
                />
            </Paper>
        </div>
    );
};
