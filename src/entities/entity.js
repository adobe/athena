const path = require("path");
const {validateSchema} = require("./../utils");

class Entity {
    constructor(name, filePath, config) {
        this.name = name;
        this.config = config;
        this.fileData = null;
        this.type = null;
        this.context = null;
        this.taxonomy = null;

        if (filePath) {
            this.fileData = path.parse(filePath)
        }
    }

    validate = () => {
        validateSchema(this);
    };

    setContext = (context) => {
        this.context = context;
    };

    getContext = () => {
        return this.context;
    };

    setTaxonomy = (taxonomy) => {
        this.taxonomy = taxonomy;
    };

    getType = () => {
        return this.type;
    };

    getFileName = () => {
        return this.fileData && this.fileData.base;
    };

    /**
     * Returns the file path for the entity configuration. Some entities include additional
     * implementations and have their own unique methods defined in the inherited classes.
     *
     * @returns {null|string} The file path if the file data is parsed, null otherwise.
     */
    getFilePath = () => {
        if (!this.fileData) {
            return null;
        }

        return path.resolve(this.fileData.dir, this.fileData.base);
    };

    getConfig = () => {
        return this.config;
    }
}

module.exports = Entity;