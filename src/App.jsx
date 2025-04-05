

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
                tech.displayName += ` (${tech.dataName})`;
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
        console.log("Navigated to node:", x);
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
    const localizationFiles = [
        { "filename": "TIBatteryTemplate." + lang, "type": "battery" },
        { "filename": "TIDriveTemplate." + lang, "type": "drive" },
        { "filename": "TIEffectTemplate." + lang, "type": "effect" },
        { "filename": "TIFactionTemplate." + lang, "type": "faction" },
        { "filename": "TIGunTemplate." + lang, "type": "gun" },
        { "filename": "TIHabModuleTemplate." + lang, "type": "habmodule" },
        { "filename": "TIHeatSinkTemplate." + lang, "type": "heatsink" },
        { "filename": "TILaserWeaponTemplate." + lang, "type": "laserweapon" },
        { "filename": "TIMagneticGunTemplate." + lang, "type": "magneticgun" },
        { "filename": "TIMissileTemplate." + lang, "type": "missile" },
        { "filename": "TINationTemplate." + lang, "type": "nation" },
        { "filename": "TIObjectiveTemplate." + lang, "type": "objective" },
        { "filename": "TIOrgTemplate." + lang, "type": "org" },
        { "filename": "TIParticleWeaponTemplate." + lang, "type": "particleweapon" },
        { "filename": "TIPlasmaWeaponTemplate." + lang, "type": "plasmaweapon" },
        { "filename": "TIPowerPlantTemplate." + lang, "type": "powerplant" },
        { "filename": "TIProjectTemplate." + lang, "type": "project" },
        { "filename": "TIRadiatorTemplate." + lang, "type": "radiator" },
        { "filename": "TIRegionTemplate." + lang, "type": "region" },
        { "filename": "TIShipArmorTemplate." + lang, "type": "shiparmor" },
        { "filename": "TIShipHullTemplate." + lang, "type": "shiphull" },
        { "filename": "TITechTemplate." + lang, "type": "tech" },
        { "filename": "TITraitTemplate." + lang, "type": "trait" },
        { "filename": "TIUtilityModuleTemplate." + lang, "type": "utilitymodule" }
    ];

    const localizationStrings = {};
    const fetchLocalizationPromises = localizationFiles.map(localization => fetch("data/" + localization.filename).then(res => res.text()).then(text => parselocalization(localizationStrings, text, localization.type)));

    // Fetch and parse template files
    const templateFiles = [
        { "filename": "TIBatteryTemplate.json", "type": "battery" },
        { "filename": "TIBilateralTemplate.json", "type": "bilateral" },
        { "filename": "TIDriveTemplate.json", "type": "drive" },
        { "filename": "TIEffectTemplate.json", "type": "effect" },
        { "filename": "TIGunTemplate.json", "type": "gun" },
        { "filename": "TIHabModuleTemplate.json", "type": "habmodule" },
        { "filename": "TIHeatSinkTemplate.json", "type": "heatsink" },
        { "filename": "TILaserWeaponTemplate.json", "type": "laserweapon" },
        { "filename": "TIMagneticGunTemplate.json", "type": "magneticgun" },
        { "filename": "TIMissileTemplate.json", "type": "missile" },
        { "filename": "TIOrgTemplate.json", "type": "org" },
        { "filename": "TIParticleWeaponTemplate.json", "type": "particleweapon" },
        { "filename": "TIPlasmaWeaponTemplate.json", "type": "plasmaweapon" },
        { "filename": "TIPowerPlantTemplate.json", "type": "powerplant" },
        { "filename": "TIProjectTemplate.json", "type": "project" },
        { "filename": "TIRadiatorTemplate.json", "type": "radiator" },
        { "filename": "TIShipArmorTemplate.json", "type": "shiparmor" },
        { "filename": "TIShipHullTemplate.json", "type": "shiphull" },
        { "filename": "TITechTemplate.json", "type": "tech" },
        { "filename": "TITraitTemplate.json", "type": "trait" },
        { "filename": "TIUtilityModuleTemplate.json", "type": "utilitymodule" }
    ]

    const templateData = {};
    const fetchTemplatePromises = templateFiles.map(template => fetch("data/" + template.filename).then(res => res.text()).then(text => parseTemplate(templateData, text, template.type)));
    await Promise.all([].concat(fetchLocalizationPromises, fetchTemplatePromises));

    return {
        localizationStrings,
        templateData,
        locale,
    }
}
