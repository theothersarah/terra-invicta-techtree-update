

import './App.css'
import { Searchbox } from './Searchbox.jsx'
import { TechGraph } from './TechGraph.jsx'
import { TechSidebar } from './TechSidebar.jsx'
import React, { useEffect, useState, useCallback } from 'react';
import {getAncestorTechs, getDescendentTechs, parselocalization, getLocalizationString, getReadable, parseTemplate } from './utils.js'
import { useNavigate, useParams } from "react-router";
import LanguageSelector from './LanguageSelector.jsx';

function App() {
    const [appStaticData, setAppStaticData] = useState({
    });

    const [techTree, setTechTree] = useState(null);
    const [navigatedToNode, setNavigatedToNode] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [language, setLanguage] = useState("en");

    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        async function initialize() {
            await init(language, setTechTree, setAppStaticData);
            setIsReady(true);
        }
        initialize();
    }, [language, setTechTree, setAppStaticData]);

    useEffect(() => {
        if (id && techTree) {
          const node = techTree.find(tech => tech.dataName === id);
          if (node) {
            setNavigatedToNode(node);
          }
        }
      }, [id, techTree]);

    const onNavigatedToNode = useCallback((x) => {
        setNavigatedToNode(x);
        if (x) {
            navigate(`/${x.dataName}`);
        } else {
            // navigate to / adds a lot of breaks in hostory - do not do it for now
            // navigate(`/`);
        }
    }, [setNavigatedToNode, navigate])

    const onShowProjects = useCallback((showToggle) => {
        setTechTree(showToggle ? appStaticData.techs.concat(appStaticData.projects) : appStaticData.techs);
    }, [appStaticData.techs, appStaticData.projects]);

    const handleIsolatedChanged = useCallback((isolated) => {
        if (isolated) {
            const node = navigatedToNode;
            const isolatedTree = getAncestorTechs(techTree, node).concat(getDescendentTechs(techTree, node)).concat(node);
            const isolatedTreeSet = [...new Map(isolatedTree.map(v => [v.dataName, v])).values()];
            setTechTree(isolatedTreeSet);
        } else {
            setTechTree(appStaticData.techs.concat(appStaticData.projects));
        }
    }, [appStaticData.techs, appStaticData.projects, techTree, navigatedToNode]);

    return (
        <>
            <title>Terra Invicta Tech Tree - Game Version 0.4.78</title>
            {!isReady && <div id="loading">Loading</div>}
            {isReady && (
                <div id="options"> 
                    <Searchbox
                        techTree={techTree}
                        setShowProjects={onShowProjects}
                        onNavigateToNode={onNavigatedToNode}
                        getLocalizationString={appStaticData.getLocalizationString}
                        getReadable={appStaticData.getReadable}
                        templateData={appStaticData.templateData}
                    />
                    <LanguageSelector 
                        onLanguageChange={setLanguage}
                    />
                </div>
            )}
            {isReady && (
                    <TechGraph
                        techTree={techTree}
                        onNavigateToNode={onNavigatedToNode}
                        navigatedToNode={navigatedToNode}
                        setReady={setIsReady}
                    />
                )}
            {isReady && (
                    <TechSidebar
                        templateData={appStaticData.templateData}
                        getLocalizationString={appStaticData.getLocalizationString}
                        getReadable={appStaticData.getReadable}
                        language={language}
                        onNavigateToNode={onNavigatedToNode}
                        navigatedToNode={navigatedToNode}
                        effects={appStaticData.effects}
                        techTree={techTree}
                        handleIsolatedChanged={handleIsolatedChanged}
                    />
                )}
        </>
    )
}

export default App

async function init(language, setTechTree, setAppStaticData) {
    const { localizationStrings, templateData } = await getTemplateData(language);

    const effects = templateData.effect;
    const techs = templateData.tech;
    const projects = templateData.project;

    projects.forEach(project => { project.isProject = true });

    const counts = {};
    const techTreeTmp = [].concat(techs, projects);
    techTreeTmp.forEach((tech, index) => {
        if (tech.isProject) {
            tech.displayName = getReadable(localizationStrings, "project", tech.dataName, "displayName");
        } else {
            tech.displayName = getReadable(localizationStrings, "tech", tech.dataName, "displayName");
        }
        tech.id = index;
        counts[tech.displayName] = (counts[tech.displayName] ?? 0) + 1;
    });

    for (const tech of techTreeTmp) {
        if (counts[tech.displayName] > 1) {
            tech.displayName += ` (${tech.friendlyName})`;
        }
    }

    setAppStaticData({
        templateData,
        effects,
        techs,
        projects,
        getLocalizationString: (a, b, c) => getLocalizationString(localizationStrings, a, b, c),
        getReadable: (a, b, c) => getReadable(localizationStrings, a, b, c),
    });
    setTechTree(techTreeTmp);
};

async function getTemplateData(language) {
    // Fetch and parse localization files
    const templateTypes = {
        "TIBatteryTemplate": "battery",
        "TIDriveTemplate": "drive",
        "TIEffectTemplate": "effect",
        "TIFactionTemplate": "faction",
        "TIGunTemplate": "gun",
        "TIHabModuleTemplate": "habmodule",
        "TIHeatSinkTemplate": "heatsink",
        "TILaserWeaponTemplate": "laserweapon",
        "TIMagneticGunTemplate": "magneticgun",
        "TIMissileTemplate": "missile",
        "TINationTemplate": "nation",
        "TIObjectiveTemplate": "objective",
        "TIOrgTemplate": "org",
        "TIParticleWeaponTemplate": "particleweapon",
        "TIPlasmaWeaponTemplate": "plasmaweapon",
        "TIPowerPlantTemplate": "powerplant",
        "TIProjectTemplate": "project",
        "TIRadiatorTemplate": "radiator",
        "TIRegionTemplate": "region",
        "TIShipArmorTemplate": "shiparmor",
        "TIShipHullTemplate": "shiphull",
        "TITechTemplate": "tech",
        "TITraitTemplate": "trait",
        "TIUtilityModuleTemplate": "utilitymodule",
    };

    const localizationFiles = Object.entries(templateTypes).map(([filename, type]) => ({
        url: `gamefiles/Localization/${language}/${filename}.${language}`,
        type
    }));

    const localizationStrings = {};
    const fetchLocalizationPromises = localizationFiles.map(localization => fetch(localization.url).then(res => res.text()).then(text => parselocalization(localizationStrings, text, localization.type)));

    const templateFiles = Object.entries(templateTypes).concat([["TIBilateralTemplate", "bilateral"]])
        .map(([filename, type]) => ({
            url: `gamefiles/Templates/${filename}.json`,
            type
        }));

    const templateData = {};
    const fetchTemplatePromises = templateFiles.map(template => fetch(template.url).then(res => res.text()).then(text => parseTemplate(templateData, text, template.type)));
    await Promise.all([].concat(fetchLocalizationPromises, fetchTemplatePromises));

    templateData.project.splice(templateData.project.findIndex(project => project.dataName === "Project_AlienMasterProject"), 1);
    templateData.project.splice(templateData.project.findIndex(project => project.dataName === "Project_AlienAdvancedMasterProject"), 1);

    return {
        localizationStrings,
        templateData,
    }
}
