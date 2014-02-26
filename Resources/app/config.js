var config = module.exports = {
    getServer: function() {
        return Ti.App.Properties.getString('server_url_preference');
    },
    hasServer: function() {
        return config.getServer();
    }
};
