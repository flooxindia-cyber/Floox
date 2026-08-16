const { adapt } = require('./_adapter');
const fn = require('../server/functions/delete-account').handler;
module.exports = adapt(fn);
