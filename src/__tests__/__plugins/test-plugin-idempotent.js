let invoked = false;

function resolveHandler(key) {
  return globalThis.__testPluginHandlers?.get(key);
}

const plugin = {
  async register() {
    if (invoked) {
      return;
    }

    invoked = true;
    const handler = resolveHandler('idempotent-plugin');
    if (handler) {
      await handler();
    }
  },
};

module.exports = plugin;
module.exports.default = plugin;
module.exports.plugin = plugin;
