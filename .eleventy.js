module.exports = function (eleventyConfig) {
    // pass through static files
    eleventyConfig.addPassthroughCopy("source/static");

    // bug fix: necessary to merge tags from front matter and .json
    eleventyConfig.setDataDeepMerge(true);

    // only process .md, .html and .ejs files
    eleventyConfig.setTemplateFormats(["md", "ejs", "html"]);

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
