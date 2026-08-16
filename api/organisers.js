const { adapt } = require('./_adapter');
const fn = require('../server/functions/organisers').handler;
module.exports = adapt(fn);
