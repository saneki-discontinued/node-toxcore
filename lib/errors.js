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
  createNonZeroReturnError: createNonZeroReturnError,
  createReturnError: createReturnError,
  createToxNoHandleError: createToxNoHandleError
};
