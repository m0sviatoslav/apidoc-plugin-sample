// Same as @apiParam
var trim = require('apidoc-core/lib/utils/trim.js');
var unindent = require('apidoc-core/lib/utils/unindent.js');

var group = '';

// Search: group, sampleField, type, optional, fieldname, defaultValue, size, description
// Example: <text=John Doe> {String{1..4}} [user.name='John Doe'] Users fullname.
//
// Naming convention:
//     b -> begin
//     e -> end
//     name -> the field value
//     oName -> wrapper for optional field
//     wName -> wrapper for field
var regExp = {
    b:               '^',                                   // start
    oGroup: {                                               // optional group: (404)
        b:               '\\s*(?:\\(\\s*',                  // starting with '(', optional surrounding spaces
        group:              '(.+?)',                        // 1
        e:               '\\s*\\)\\s*)?'                    // ending with ')', optional surrounding spaces
    },                                 // start
    oSampleField: {                                              // optional group: <text>
        b:               '\\s*(?:\\<\\s*',                  // starting with '<', optional surrounding spaces
        inputType:       '([a-zA-Z0-9()# ;:\\.\\/\\\\\\[\\]_-]+)', // 2
        oInputValue: {                                      // optional allowed values within type: <text=Joe>
            b:           '\\s*(?:=\\s*',                    // starting with '=', optional surrounding spaces
            type:        '(.+?)',                           // 3
            e:           '(?=\\s*\\>\\s*))?'                // ending with '>', optional surrounding spaces
        },
        e:               '\\s*\\>\\s*)?'                    // ending with '>', optional surrounding spaces
    },
    oType: {                                                // optional type: {string}
        b:               '\\s*(?:\\{\\s*',                  // starting with '{', optional surrounding spaces
        type:                '([a-zA-Z0-9\(\)#:\\.\\/\\\\\\[\\]_-]+)', // 4
        oSize: {                                            // optional size within type: {string{1..4}}
            b:               '\\s*(?:\\{\\s*',              // starting with '{', optional surrounding spaces
            size:                '(.+?)',                   // 5
            e:               '\\s*\\}\\s*)?'                // ending with '}', optional surrounding spaces
        },
        oAllowedValues: {                                   // optional allowed values within type: {string='abc','def'}
            b:               '\\s*(?:=\\s*',                // starting with '=', optional surrounding spaces
            possibleValues:      '(.+?)',                   // 6
            e:               '(?=\\s*\\}\\s*))?'            // ending with '}', optional surrounding spaces
        },
        e:               '\\s*\\}\\s*)?'                    // ending with '}', optional surrounding spaces
    },
    wName: {
        b:               '(\\[?\\s*',                       // 7 optional optional-marker
        name:                '([a-zA-Z0-9\\:\\.\\/\\\\_-]+',   // 8
        withArray:           '(?:\\[[a-zA-Z0-9\\.\\/\\\\_-]*\\])?)', // https://github.com/apidoc/apidoc-core/pull/4
        oDefaultValue: {                                    // optional defaultValue
            b:               '(?:\\s*=\\s*(?:',             // starting with '=', optional surrounding spaces
            withDoubleQuote:     '"([^"]*)"',               // 9
            withQuote:           '|\'([^\']*)\'',           // 10
            withoutQuote:        '|(.*?)(?:\\s|\\]|$)',     // 11
            e:               '))?'
        },
        e:               '\\s*\\]?\\s*)'
    },
    description:         '(.*)?',                           // 12
    e:               '$|@'
};

function _objectValuesToString(obj) {
    var str = '';
    for (var el in obj) {
        if (typeof obj[el] === 'string')
            str += obj[el];
        else
            str += _objectValuesToString(obj[el]);
    }
    return str;
}

var parseRegExp = new RegExp(_objectValuesToString(regExp));

var allowedValuesWithDoubleQuoteRegExp = new RegExp(/\"[^\"]*[^\"]\"/g);
var allowedValuesWithQuoteRegExp = new RegExp(/\'[^\']*[^\']\'/g);
var allowedValuesRegExp = new RegExp(/[^,\s]+/g);

function parse(content, source, defaultGroup) {
    content = trim(content);

    // replace Linebreak with Unicode
    content = content.replace(/\n/g, '\uffff');

    var matches = parseRegExp.exec(content);

    if ( ! matches)
        return null;

    // reverse Unicode Linebreaks
    matches.forEach(function (val, index, array) {
        if (val) {
            array[index] = val.replace(/\uffff/g, '\n');
        }
    });

    var allowedValues = matches[6];
    if (allowedValues) {
        var regExp;
        if (allowedValues.charAt(0) === '"')
            regExp = allowedValuesWithDoubleQuoteRegExp;
        else if (allowedValues.charAt(0) === '\'')
            regExp = allowedValuesWithQuoteRegExp;
        else
            regExp = allowedValuesRegExp;

        var allowedValuesMatch;
        var list = [];

        while ( (allowedValuesMatch = regExp.exec(allowedValues)) ) {
            list.push(allowedValuesMatch[0]);
        }
        allowedValues = list;
    }

    // Set global group variable
    group = matches[1] || defaultGroup || 'Parameter';

    return {
        group        : group,
        inputType    : matches[2] || 'text',
        inputValue   : matches[3],
        type         : matches[4],
        size         : matches[5],
        allowedValues: allowedValues,
        optional     : (matches[7] && matches[7][0] === '[') ? true : false,
        field        : matches[8],
        defaultValue : matches[9] || matches[10] || matches[11],
        description  : unindent(matches[12] || '')
    };
}

function path() {
    return 'local.parameter.samples.' + getGroup();
}

function getGroup() {
    return group;
}

/**
 * Exports
 */
module.exports = {
    parse         : parse,
    path          : path,
    method        : 'push',
    getGroup      : getGroup,
    markdownFields: [ 'description', 'type' ],
    markdownRemovePTags: [ 'type' ]
};
