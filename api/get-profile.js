const { adapt } = require('./_adapter');
const fn = require('../server/functions/get-profile').handler;
module.exports = adapt(fn);
