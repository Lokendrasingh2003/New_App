module.exports = {
  mongodbMemoryServerOptions: {
    instance: {
      dbName: 'cityconnect-test',
    },
    binary: {
      version: '7.0.5',
      skipMD5: true,
    },
    autoStart: false,
  },
};
