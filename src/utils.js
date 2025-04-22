export function findBlockingTechs(techDb, techToSearch) {
    return techDb.getBlockingTechs(techToSearch);
}

export function findPrereqTechs(techDb, techToSearch) {
    if (!techToSearch.prereqs) {
        return [];
    }
    return techToSearch.prereqs.filter(prereq => prereq !== "").flatMap(prereq => {
        const tech = techDb.getTechByDataName(prereq);
        return tech ? [tech] : [];
    });
}

export function getAncestorTechs(techDb, techToSearch) {
    if (!techToSearch) {
        return null;
    }

    return findPrereqTechs(techDb, techToSearch)
        .reduce((arr, curr) => arr.concat(getAncestorTechs(techDb, curr)), [])
        .concat(findPrereqTechs(techDb, techToSearch));
}

export function getDescendentTechs(techDb, techToSearch) {
    if (!techToSearch) {
        return null;
    }
    return findBlockingTechs(techDb, techToSearch)
        .reduce((arr, curr) => arr.concat(getDescendentTechs(techDb, curr)), [])
        .concat(findBlockingTechs(techDb, techToSearch));
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
    let text = getLocalizationString(localizationStrings, type, dataName, field);

    if (text) {
        return text;
    }

    if (dataName.startsWith("2070")) {
        return null;
    }

    if (dataName.startsWith("map_")) {
        text = getLocalizationString(localizationStrings, type, dataName.replace("map_", ""), field);
    }

    if (text) {
        return text;
    }

    console.log(`Missing localization for ${type}.${dataName}.${field}`);

    return type + "." + dataName + "." + field;
}

export function parseTemplate(templateData, text, templateType) {
    const data = JSON.parse(text);
    templateData[templateType] = data.filter(entry => !entry.disable);
}