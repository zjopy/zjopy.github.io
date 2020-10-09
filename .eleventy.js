const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
    // pass through static files
    eleventyConfig.addPassthroughCopy("source/static");
    eleventyConfig.addPassthroughCopy("source/projects");

    // bug fix: necessary to merge tags from front matter and .json
    eleventyConfig.setDataDeepMerge(true);

    // only process .md, .html and .ejs files
    eleventyConfig.setTemplateFormats(["md", "ejs", "html"]);

    // plugins
    eleventyConfig.addPlugin(pluginSyntaxHighlight);

    return {
        // set input and output folder
        dir: {
            input: "source",
            output: "build"
        },

        // use EJS as processing engine
        dataTemplateEngine: "ejs",
        markdownTemplateEngine: "ejs",
        htmlTemplateEngine: "ejs",
    };
};
