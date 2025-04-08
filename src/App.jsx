

import './App.css'
import { Searchbox } from './Searchbox.jsx'
import { TechGraph } from './TechGraph.jsx'
import { TechSidebar } from './TechSidebar.jsx'
import React, { useEffect, useState, useCallback } from 'react';
import {getAncestorTechs, getDescendentTechs, parselocalization, getLocalizationString, getReadable, parseTemplate } from './utils.js'
import { useNavigate, useParams } from "react-router";

function App() {
    const [appStaticData, setAppStaticData] = useState({
    });

    const [techTree, setTechTree] = useState(null);
    const [navigatedToNode, setNavigatedToNode] = useState(null);
    const [isReady, setIsReady] = useState(false);

    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        async function initialize() {
            await initSearchData();
            setIsReady(true);
        }
        initialize();
    }, []);

    useEffect(() => {
        if (id && techTree) {
          const node = techTree.find(tech => tech.dataName === id);
          if (node) {
            setNavigatedToNode(node);
          }
        }
      }, [id, techTree]);

    const initSearchData = async () => {
        const { localizationStrings, templateData, locale } = await init();

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
            locale,
            getLocalizationString: (a, b, c) => getLocalizationString(localizationStrings, a, b, c),
            getReadable: (a, b, c) => getReadable(localizationStrings, a, b, c),
        });
        setTechTree(techTreeTmp);
    };

    const onNavigatedToNode = useCallback((x) => {
        setNavigatedToNode(x);
        if (x) {
            navigate(`/${x.dataName}`);
        } else {
            navigate(`/`);
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
                <Searchbox
                    techTree={techTree}
                    setShowProjects={onShowProjects}
                    onNavigateToNode={onNavigatedToNode}
                    getLocalizationString={appStaticData.getLocalizationString}
                    templateData={appStaticData.templateData}
                />
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
                        locale={appStaticData.locale}
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


async function init() {
    // Get language and locale from query string
    const urlParams = new URLSearchParams(window.location.search);

    const lang = urlParams.get("lang") ?? "en";

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

    const locale = locales[lang];

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
        url: `gamefiles/Localization/${lang}/${filename}.${lang}`,
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

    return {
        localizationStrings,
        templateData,
        locale,
    }
}
