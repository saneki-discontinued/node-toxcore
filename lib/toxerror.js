"use strict";

var util = require('util');
/**
 * Creates a ToxError instance
 * @class
 * @param {String} type of error
 * @param {Number} code of type
 * @param {String} message of error
 */
function ToxError(type, code, message) {
    this.name = "ToxError";
    this.type = ( type || "ToxError" );
    this.code = ( code || 0 );//associated with this type of error.//default code:0-unsuccessful
    this.message = ( message || (this.type+": "+this.code) );
    Error.captureStackTrace( this, ToxError);
}

util.inherits(ToxError, Error);
exports = module.exports = ToxError;