const { removeSync } = require('fs-extra');
const { BUILD_DIR } = require('../flambe.config');

module.exports = async () => removeSync(BUILD_DIR);
