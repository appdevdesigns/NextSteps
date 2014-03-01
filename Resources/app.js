/**
 * AppRAD creation URLs:
 * 
 * http://localhost:8088/appRAD/module/create?name=nextSteps
 * http://localhost:8088/appRAD/model/create?module=nextSteps&ModelName=Contact&tableName=nextsteps_contact&primaryKey=contact_id&labelKey=contact_firstName
 * http://localhost:8088/appRAD/model/create?module=nextSteps&ModelName=Group&tableName=nextsteps_group&primaryKey=group_id&labelKey=group_name
 * http://localhost:8088/appRAD/modelmultilingual/create?module=nextSteps&ModelName=Year&tableNameData=nextsteps_year_data&tableNameTrans=nextsteps_year_trans&primaryKey=year_id&listMultilingualFields=year_label&labelKey=year_label
 * http://localhost:8088/appRAD/model/create?module=nextSteps&ModelName=Tag&tableName=nextsteps_tag&primaryKey=tag_id&labelKey=tag_label
 * http://localhost:8088/appRAD/model/create?module=nextSteps&ModelName=ContactTag&tableName=nextsteps_contact_tag&primaryKey=contacttag_id&labelKey=tag_id
 * 
 */

/*
 * Unfortunately, Android does not allow access to global variables from within CommonJS modules,
 * (see http://developer.appcelerator.com/question/130229/android-cannot-find-my-global-variable-within-a-commonjs-module)
 * so the AppDev and jQuery modules must be required individually by each module that needs to use them
 */

// Initialize the AppDev framework
var AD = require('AppDev');
var $ = require('jquery');
AD.init({
    models: ['Viewer', 'Contact', 'Group', 'Campus', 'Year', 'Tag', 'ContactTag', 'Step', 'ContactStep'],
    windows: ['AppContactsWindow', 'AppGroupsWindow', 'AppStatsWindow', 'AppToolsWindow', 'AppInfoWindow']
}).done(function() {
    require('app/Transactions');
    var transactionLog = new AD.Transactions({
        fileName: 'TransactionLog.json',
        syncedModels: ['Contact', 'Campus', 'Step', 'ContactStep']
    });
    
    // Application-specific communications functions will be in app/
    require('app/comm');
    
    if (!AD.Config.hasServer()) {
        console.log('Does not have server specified.');
        return;
    }
    
    var serverURL = AD.Config.getServer();
    if (serverURL === AD.PropertyStore.get('lastSyncServer')) {
        //return;
    }
    
    var ping = function(callback) {
        serverURL = AD.Config.getServer();
        AD.Comm.HTTP.get({
            url: 'http://'+serverURL+'/nsserver/ping'
        }).done(callback).fail(function() {
            AD.UI.yesNoAlert('Could not access the server. Please ensure that the server URL is correct and that you are connected to your VPN. Do you want to try again?').done(function() {
                // Try again
                ping(callback);
            });
        });
    };
    ping(function() {
        console.log('Successfully contacted server: ' + serverURL);
        var sUsername;
        var sPassword;
        
        // Show login window
        var $winLoginWindow = new AD.UI.LoginWindow({
            validateCredentials: function(username, password) {
                console.log('Validating credentials...');
                sUsername = username;
                sPassword = password;
                return AD.Comm.validateCredentials(serverURL, username, password);
            }
        });
        $winLoginWindow.open();
        $winLoginWindow.getDeferred().done(function() {
            console.log('Login credentials are valid');
            
            require('ui/ProgressWindow');
            var $winDownloadingWindow = new AD.UI.ProgressWindow({
                title: 'Downloading',
                message: 'Downloading data from the server...'
            });
            $winDownloadingWindow.open();
            
            AD.Comm.syncWithServer(serverURL, transactionLog.get(), sUsername, sPassword).done(function() {
                transactionLog.apply(transactions);
                transactionLog.clear();
            }).fail(function() {
                alert('Could not access the server!');
            }).always(function() {
                $winDownloadingWindow.close();
            });
        });
    });
});
