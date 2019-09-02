const path = require("path");

class Entity {
    constructor(name, filePath, config) {
        this.name = name;
        this.config = config;
        this.fileData = null;
        this.fileName = null;
        this.type = null;
        this.context = null;
        this.taxonomy = null;

        if (filePath) {
            this.fileData = path.parse(filePath)
        }
    }

    setContext = (context) => {
        this.context = context;
    };

    getContext = () => {
        return this.context;
    };

    setTaxonomy = (taxonomy) => {
        this.taxonomy = taxonomy;
    };
}

module.exports = Entity;