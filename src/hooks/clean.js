const { removeSync } = require('fs-extra');
const { BUILD_DIR } = require('../flambe.config');

module.exports = () => removeSync(BUILD_DIR);