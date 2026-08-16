const { adapt } = require('./_adapter');
const fn = require('../server/functions/artists').handler;
module.exports = adapt(fn);
