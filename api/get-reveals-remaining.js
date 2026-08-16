const { adapt } = require('./_adapter');
const fn = require('../server/functions/get-reveals-remaining').handler;
module.exports = adapt(fn);
