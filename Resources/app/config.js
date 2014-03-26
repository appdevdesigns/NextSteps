var config = module.exports = {
    getServer: function() {
        return Ti.App.Properties.getString('server_url_preference');
    },
    hasServer: function() {
        return config.getServer();
    },
    stepLocationEnabled: function() {
        return Ti.App.Properties.getBool('step_location_enabled_preference');
    }
};
