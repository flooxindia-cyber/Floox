const { adapt } = require('./_adapter');
const fn = require('../server/functions/artist-profile').handler;
module.exports = adapt(fn);
