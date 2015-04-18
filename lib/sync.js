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
