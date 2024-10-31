// webpack.config.js
module.exports = {
    // Diğer ayarlar...
    resolve: {
        fallback: {
            process: require.resolve("process/browser"),
        },
    },
};