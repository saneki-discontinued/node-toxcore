var _ = require('underscore');

/**
 * Checks if the passed Arguments have a callback (in other words,
 * if the last argument is a Function).
 * @param {Arguments} args Arguments to check
 * @return {Boolean} true if last argument is a Function, false if not
 *                   (or if invalid args)
 */
var hasCallback = function(args) {
  if(!args || args.length === 0) {
    return false;
  }

  var last = _.last(args);
  return _.isFunction(last);
};

module.exports = {
  hasCallback: hasCallback
};
