// Same as @apiParam
var apiParser = require('./api_param_sample.js');

function parse(content, source) {
    return apiParser.parse(content, source, 'Header');
}

function path() {
    return 'local.header.samples.' + apiParser.getGroup();
}

/**
 * Exports
 */
module.exports = {
    parse         : parse,
    path          : path,
    method        : apiParser.method,
    markdownFields: [ 'description' ]
};
