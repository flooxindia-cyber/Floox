const { adapt } = require('./_adapter');
const fn = require('../server/functions/organiser-profile').handler;
module.exports = adapt(fn);
