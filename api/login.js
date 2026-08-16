const { adapt } = require('./_adapter');
const fn = require('../server/functions/login').handler;
module.exports = adapt(fn);
