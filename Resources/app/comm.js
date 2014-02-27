var AD = require('AppDev');
var $ = require('jquery');

module.exports = $.extend(AD.Comm, {
    pingServer: function(server) {
        return AD.Comm.HTTP.get({
            url: 'http://'+server+'/nsserver/ping'
        });
    },
    
    // Make an authentication request to the specified server using the provided username and password credentials
    // Return a deferred object that will resolve to true if the credentials are valid, false if they are not
    validateCredentials: function(server, username, password) {
        return AD.Comm.HTTP.post({
            url: 'http://'+server+'/nsserver/auth',
            params: {
                username: username,
                password: password
            }
        }).pipe(function(response) {
            return response.status === 'success';
        });
    }
});
