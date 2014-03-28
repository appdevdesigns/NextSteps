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
        return AD.Comm.appdevRequest({
            method: 'POST',
            url: 'http://'+server+'/nsserver/auth',
            params: {
                username: username,
                password: password
            }
        }).then(function(response) {
            console.log("response (done) = ");
            console.log(response);
            return true;
        }, function(response) {
            console.log("response (fail) = ");
            console.log(response);
            return false;
        }).promise();
    },
    
    // Send the provided transactions to the server and return a deferred
    // that will resolve to the transaction log received from the server
    syncWithServer: function(server, transactions, username, password) {
        var syncDfd = $.Deferred();
        AD.Comm.appdevRequest({
            method: 'POST',
            url: 'http://'+server+'/nsserver/sync',
            params: {
                username: username,
                password: password,
                lastSyncTimestamp: AD.PropertyStore.get('lastSyncTimestamp') || 0,
                appVersion: AD.Defaults.version,
                transactionLog: transactions
            }
        }).done(function(response) {
            console.log("syncWithServer() >> response (done) = ");
            console.log(response);
            AD.PropertyStore.set('lastSyncServer', server);
            AD.PropertyStore.set('lastSyncTimestamp', response.data.lastSyncTimestamp);
            syncDfd.resolve(response.data.transactionLog);
        }).fail(syncDfd.reject);
        return syncDfd.promise();
    },
    
    // Make a request to an AppDev resource
    appdevRequest: function(options) {
        var requestDfd = $.Deferred();
        AD.Comm.HTTP.request(options).done(function(response) {
            if (response.status === 'success') {
                // The request succeeded
                requestDfd.resolve(response);
            }
            else {
                // The request failed
                requestDfd.reject(response);
            }
        }).fail(requestDfd.reject);
        return requestDfd.promise();
    }
});
