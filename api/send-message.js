const { adapt } = require('./_adapter');
const fn = require('../server/functions/send-message').handler;
module.exports = adapt(fn);
