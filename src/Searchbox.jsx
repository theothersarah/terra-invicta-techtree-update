import React, { useState, useRef, useEffect } from 'react';
import { Paper, Autocomplete, TextField, FormControlLabel, Switch } from '@mui/material';
import FlexSearch from 'flexsearch';

export const Searchbox = ({
    techDb,
    setShowProjects,
    onNavigateToNode,
    getLocalizationString,
    templateData,
}) => {
    const [results, setResults] = useState([]);
    const [documentSearchIndex, setDocumentSearchIndex] = useState(null);
    const [fullText, setFullText] = useState(false);

    const updateDocumentSearchIndex = (techDb) => {
        const documentSearchIndex = new FlexSearch.Document({
            document: {
                index: ["displayName", "fullText"],
                store: ["displayName", "fullText"],
            },
            tokenize: "full"
        });

        techDb.getAllTechs().forEach((node) => {
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
                        if (module.requiredProjectName === node.dataName) {
                            const description = getLocalizationString(modType, module.dataName, "description");
                            modulesText.push(`${getLocalizationString(modType, module.dataName, "displayName")}/${description}`);
                        }
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
        updateDocumentSearchIndex(techDb);
    }, [techDb]);

    const searchInputRef = useRef(null);

    const handleInputChange = (_, value) => {
        if (!value) {
            setResults([]);
            return;
        }
    
        const isQuoted = value.startsWith('"') && value.endsWith('"');
        const query = isQuoted ? value.slice(1, -1) : value;
    
        // Search on all relevant fields
        const rawResults = documentSearchIndex.search(query, {
            pluck: (fullText ? "fullText" : "displayName"),
            enrich: true
        });

        let searchResults;
    
        if (isQuoted) {
            const field = fullText ? "fullText" : "displayName";
            const regex = new RegExp(query, "i");
            // Simulate exact match
            searchResults = rawResults
                .filter(entry => entry.doc[field].match(regex))
                .map(entry => entry.doc.displayName);
        } else {
            searchResults = rawResults.map(entry => entry.doc.displayName);
        }
    
        setResults(searchResults);
    };

    const navigateToTech = (value) => {
        const navigateToNode = techDb.getTechByDisplayName(value);

        if (navigateToNode) {
            onNavigateToNode(navigateToNode);
        }
    };

    const handleChange = (_, value) => {
        if (!value) return;

        navigateToTech(value);
    };

    const handleKeyDown = (e) => {
        if (e.key !== "Enter") {
            return;
        }
        navigateToTech(e.target.value);
    };

    // TODO: handle autocomplete on toggle
    const handleProjectsToggle = (event) => {
        const showToggle = event.target.checked;
        setShowProjects(showToggle);
    };

    const handleClick = (e) => {
        navigateToTech(e.target.value);
    };

    return (
        <div>
            <Paper elevation={3} id="searchBox">
                <Autocomplete
                    options={results}
                    freeSolo
                    onInputChange={handleInputChange}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    filterOptions={x => x}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Search"
                            inputRef={searchInputRef}
                            autoFocus
                            onClick={handleClick}
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
