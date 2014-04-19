var AD = require('AppDev');
var $ = require('jquery');

module.exports = $.extend(AD.Comm, {
    pingServer: function(server) {
        return AD.Comm.HTTP.get({
            url: server+'/nsserver/ping'
        }).then(function(response) {
            // Tweak the API configuration response to make it more useful
            var apiConfig = response;
            apiConfig.server = server;
            // Prepend the server url to each of the uri paths so that they will be fully qualified URLs
            $.each(apiConfig.uris, function(key, uri) {
                apiConfig.uris[key] = server + uri;
            });
        });
    },
    
    // Make an authentication request to the specified server using the provided username and password credentials
    // Return a deferred object that will be resolved if the credentials are valid and rejected if they are invalid
    authenticate: function(apiConfig, username, password) {
        var authenticateDfd = $.Deferred();
        
        // Get the CAS service ticket
        var casConfig = apiConfig.CAS;
        var cas = new AD.Comm.CAS({ casBaseUrl: casConfig.uri });
        cas.getServiceTicket(username, password, apiConfig.server + '/' + casConfig.authURI).done(function(serviceTicket) {
            console.log('CAS service ticket: ' + serviceTicket);
            AD.Comm.appdevRequest({
                method: 'POST',
                url: apiConfig.uris.auth,
                query: {
                    ticket: serviceTicket
                },
                params: {
                    username: username,
                    password: password
                }
            }).done(authenticateDfd.resolve).fail(authenticateDfd.reject).fail(function(response) {
                console.log('Authentication failed:');
                console.log(response);
            });
        }).fail(authenticateDfd.reject).fail(function(response) {
            console.log('getServiceTicket failed:');
            console.log(response);
        });
        
        return authenticateDfd.promise();
    },
    
    // Send the provided transactions to the server and return a deferred
    // that will resolve to the transaction log received from the server
    syncWithServer: function(apiConfig, transactions, username, password) {
        var syncDfd = $.Deferred();
        AD.Comm.appdevRequest({
            method: 'POST',
            url: apiConfig.uris.sync,
            params: {
                username: username,
                password: password,
                lastSyncTimestamp: AD.PropertyStore.get('lastSyncTimestamp') || 0,
                appVersion: AD.Defaults.version,
                transactionLog: transactions
            },
            timeout: 300000 // five minutes
        }).done(function(response) {
            console.log("syncWithServer() >> response (done) = ");
            console.log(response);
            AD.PropertyStore.set('lastSyncServer', apiConfig.server);
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
