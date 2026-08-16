const { adapt } = require('./_adapter');
const fn = require('../server/functions/toggle-like').handler;
module.exports = adapt(fn);
