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

var toxcore = require('toxcore');

var clients = {
  'toxme.io': undefined // toxme.io is the default if no key provided
};

Object.keys(clients).map(function(value, index) {
  clients[value] = new toxcore.ToxDns({ key: clients[value] });
});

var getAddressDomain = function(dnsaddr) {
  var split = dnsaddr.split('@');
  if(split.length === 2)
    return split[1];
};

var getClientForAddress = function(dnsaddr) {
  var domain = getAddressDomain(dnsaddr);
  if(domain !== undefined && clients[domain] !== undefined)
    return clients[domain];
};

process.argv.slice(2).forEach(function(dnsaddr) {
  var client = getClientForAddress(dnsaddr);
  client.resolveHex(dnsaddr, function(err, addr) {
    if(!err) {
      console.log('%s: %s', dnsaddr, addr);
    } else {
      console.log('%s: Error occurred: %s', dnsaddr, err);
    }
  });
});
