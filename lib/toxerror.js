/*
 * This file is part of node-toxcore.
 *
 * node-toxcore is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * node-toxcore is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with node-toxcore. If not, see <http://www.gnu.org/licenses/>.
 *
 */

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
    this.code = ( code || 0 ); // 0 = unsuccessful
    this.message = ( message || (this.type + ": " + this.code) );
    Error.captureStackTrace(this, ToxError);
}

util.inherits(ToxError, Error);

exports = module.exports = ToxError;
