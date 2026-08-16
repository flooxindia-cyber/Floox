const { adapt } = require('./_adapter');
const fn = require('../server/functions/get-likes').handler;
module.exports = adapt(fn);
