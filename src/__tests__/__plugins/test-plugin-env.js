function resolveHandler(key) {
  return globalThis.__testPluginHandlers?.get(key);
}

const plugin = {
  async register() {
    const handler = resolveHandler('env-plugin') ?? resolveHandler('env-default');
    if (handler) {
      await handler();
    }
  },
};

module.exports = plugin;
module.exports.default = plugin;
module.exports.plugin = plugin;
