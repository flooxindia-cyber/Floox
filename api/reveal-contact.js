const { adapt } = require('./_adapter');
const fn = require('../server/functions/reveal-contact').handler;
module.exports = adapt(fn);
