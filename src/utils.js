export function findBlockingTechs(techTree, techToSearch) {
    return techTree.filter(tech => { if (tech.prereqs && tech.prereqs.find(prereq => prereq === techToSearch.dataName)) { return true; } else if (tech.altPrereq0 && tech.altPrereq0 === techToSearch.dataName) { return true; } });
}

export function findPrereqTechs(techTree, techToSearch) {
    if (!techToSearch.prereqs) {
        return [];
    }
    else {
        return techToSearch.prereqs.filter(prereq => prereq !== "").map(prereq => { return techTree.find(tech => tech.dataName === prereq); });
    }
}

export function getAncestorTechs(techTree, techToSearch) {
    if (!techToSearch) {
        return null;
    }

    return findPrereqTechs(techTree, techToSearch)
        .reduce((arr, curr) => arr.concat(getAncestorTechs(techTree, curr)), [])
        .concat(findPrereqTechs(techTree, techToSearch));
}

export function getDescendentTechs(techTree, techToSearch) {
    if (!techToSearch) {
        return null;
    }
    return findBlockingTechs(techTree, techToSearch)
        .reduce((arr, curr) => arr.concat(getDescendentTechs(techTree, curr)), [])
        .concat(findBlockingTechs(techTree, techToSearch));
}

export function parselocalization(localizationStrings, text, localizationType) {
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

        try {
            if (keySplit.length == 3) {
                localizationStrings[localizationType][keyId][keySplit[1]] = value;
            } else {
                if (!localizationStrings[localizationType][keyId][keySplit[1]]) {
                    localizationStrings[localizationType][keyId][keySplit[1]] = {};
                }

                localizationStrings[localizationType][keyId][keySplit[1]][keySplit[3]] = value;
            }
        } catch {
            // TODO: why we're getting in here?
        }
    });
}

export function getLocalizationString(localizationStrings, type, dataName, field) {
    return localizationStrings[type]?.[dataName]?.[field];
}

export function getReadable(localizationStrings, type, dataName, field) {
    const text = getLocalizationString(localizationStrings, type, dataName, field);

    if (text)
        return text;

    return type + "." + dataName + "." + field;
}

export function parseTemplate(templateData, text, templateType) {
    const data = JSON.parse(text);
    templateData[templateType] = data.filter(entry => !entry.disable);
}