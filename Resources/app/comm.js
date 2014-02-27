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
    },
    
    // Send the provided transactions to the server and return a deferred
    // that will resolve to the transaction log received from the server
    syncWithServer: function(server, transactions) {
        var syncDfd = $.Deferred();
        AD.Comm.HTTP.post({
            url: 'http://'+server+'/nsserver/sync',
            params: {
                lastSyncTimestamp: AD.PropertyStore.get('lastSyncTimestamp') || 0,
                appVersion: AD.Defaults.version,
                transactionLog: transactions
            }
        }).done(function(response) {
            console.log(response);
            AD.PropertyStore.set('lastSyncServer', server);
            AD.PropertyStore.set('lastSyncTimestamp', response.data.lastSyncTimestamp);
            if (response.status === 'success') {
                syncDfd.resolve(response.data.transactionLog);
            }
            else {
                syncDfd.reject(response);
            }
        }).fail(syncDfd.reject);
        return syncDfd.promise();
    }
});
