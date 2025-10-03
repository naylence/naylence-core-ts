function resolveHandler(key) {
  return globalThis.__testPluginHandlers?.get(key);
}

async function invokeHandler(key) {
  const handler = resolveHandler(key);
  if (handler) {
    await handler();
  }
}

const plugin = {
  async register() {
    const handler = resolveHandler('config-plugin');
    if (handler) {
      await handler();
      return;
    }

    await invokeHandler('config-default');
  },
};

module.exports = plugin;
module.exports.default = plugin;
module.exports.plugin = plugin;
