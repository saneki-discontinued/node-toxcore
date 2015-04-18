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

/**
 * Create an Error for when library functions return negative
 * value unexpectedly.
 * @param {String} fname Function name
 * @param {Number} val Return value
 * @return {Error} Error object
 */
var createNegativeReturnError = function(fname, val) {
  var err = new Error('Negative return value for ' + fname);
  err.tox = { name: fname, returned: val };
  return err;
};

/**
 * Create an Error for when library functions return non-one values
 * unexpectedly.
 * @param {String} fname Function name
 * @param {Number} val Return value
 * @return {Error} Error object
 */
var createNonOneReturnError = function(fname, val) {
  var error = new Error('Non-one return value for ' + fname);
  error.tox = { name: fname, returned: val };
  return error;
};

/**
 * Create an Error for when library functions return non-positive
 * value unexpectedly.
 * @param {String} fname Function name
 * @param {Number} val Return value
 * @return {Error} Error object
 */
var createNonPositiveReturnError = function(fname, val) {
  var err = new Error('Non-positive return value for ' + fname);
  err.tox = { name: fname, returned: val };
  return err;
};

/**
 * Create an Error for when library functions return non-zero values
 * unexpectedly.
 * @param {String} fname Function name
 * @param {Number} val Return value
 * @return {Error} Error object
 */
var createNonZeroReturnError = function(fname, val) {
  var error = new Error('Non-zero return value for ' + fname);
  error.tox = { name: fname, returned: val };
  return error;
};

/**
 * Create an Error for when library functions return unexpected values.
 * @param {String} fname Function name
 * @param {Number} val Return value
 * @param {Number} expected Expected value
 * @return {Error} Error object
 */
var createReturnError = function(fname, val, expected) {
  var error = new Error('Unexpected return value for ' + fname);
  error.tox = { name: fname, returned: val, expected: expected };
  return error;
};

/**
 * Create an error for when a Tox object is missing a handle.
 * @return {Error} Error object
 */
var createToxNoHandleError = function() {
  return new Error('Tox object has no handle');
};

/**
 * Create an error for when some input is not a valid tox address.
 * @param {Object} badAddr - Bad address input
 * @return {Error} Error object
 */
var createInvalidToxAddressError = function(badAddr) {
  var error = new Error('Not a valid tox address: ' + badAddr);
  error.tox = { badAddr: badAddr };
  return error;
};

module.exports = {
  createInvalidToxAddressError: createInvalidToxAddressError,
  createNegativeReturnError: createNegativeReturnError,
  createNonOneReturnError: createNonOneReturnError,
  createNonPositiveReturnError: createNonPositiveReturnError,
  createNonZeroReturnError: createNonZeroReturnError,
  createReturnError: createReturnError,
  createToxNoHandleError: createToxNoHandleError
};
