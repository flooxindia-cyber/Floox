const { adapt } = require('./_adapter');
const fn = require('../server/functions/change-password').handler;
module.exports = adapt(fn);
