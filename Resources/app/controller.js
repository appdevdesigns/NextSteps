var AD = require('AppDev');
var $ = require('jquery');

module.exports = {

    // This will be called by app.js once the initialization is finished
    start: function() {
        console.log("DEBUG controller > Entered start()");
        
        require('app/Transactions');
        AD.Transactions.initialize({
            fileName: 'TransactionLog.json',
            syncedModels: ['Contact', 'Campus', 'Step', 'ContactStep']
        });
        
        var serverURL = AD.Config.getServer();
        
        if (!AD.Config.hasServer()) {
            if (!AD.Platform.isiOS) {
                alert("You are in offline mode. To sync with server, go to Tools -> Preferences.");
            }
        } else if (serverURL !== AD.PropertyStore.get('lastSyncServer')) {
            console.log("AD.PropertyStore = " + AD.PropertyStore);
            console.log("lastSyncServer = " + AD.PropertyStore.get('lastSyncServer'));
            console.log("serverURL = " + serverURL);
            this.performWholeSyncProcess(true);
        }
        console.log("DEBUG controller > Left start()");
    },
    
    performPreSyncValidation: function() {
        console.log("DEBUG controller > Entered performPreSyncValidation()");
        var serverURL = AD.Config.getServer();
        
        if (!AD.Config.hasServer()) {
            console.log('Does not have server specified.');
            if (!AD.Platform.isiOS) {
                alert("Please specify the server first. To specify the server, go to Preferences -> Sync Options.");
            }
        } else {
            this.performWholeSyncProcess(false);
        }
        console.log("DEBUG controller > Left performPreSyncValidation()");
    },
    
    // This will perform the following: check if server URL is supplied & ping with server, authenticate user, and sync with server if authentication is successful. If not, the user will be directed to the contacts page and operate in offline mode.
    performWholeSyncProcess: function(isInitial) {
        console.log("DEBUG controller > Entered performWholeSyncProcess()");
        require('app/Transactions');
        require('app/comm'); // Application-specific communications functions will be in app
        
        var transactionLog = AD.Transactions.getInstance();
        
        var serverURL = null;
        
        var ping = function(callback) {
            serverURL = AD.Config.getServer();
            AD.Comm.HTTP.get({
                url: 'http://'+serverURL+'/nsserver/ping'
            }).done(callback).fail(function() {
                console.log();
                AD.UI.yesNoAlert('Could not access the server. Please ensure that the server URL is correct and that you are connected to your VPN. Do you want to try again?').done(function() {
                    // Try again
                    ping(callback);
                });
            });
        };
        
        console.log("start ping()");
        ping(function() {
            console.log('Successfully contacted server: ' + serverURL);
            var sUsername;
            var sPassword;
            
            // Show login window
            // Check if pressing cancel will still continue to the login window
            var $winLoginWindow = new AD.UI.LoginWindow({
                validateCredentials: function(username, password) {
                    console.log('Validating credentials...');
                    sUsername = username;
                    sPassword = password;
                    return AD.Comm.validateCredentials(serverURL, username, password);
                }
            });
            
            console.log("open $winLoginWindow()");
            $winLoginWindow.open();
            $winLoginWindow.getDeferred().done(function() {
                console.log('Login credentials are valid');
                require('ui/ProgressWindow');
                var $winSyncWindow = new AD.UI.ProgressWindow({
                    title: isInitial ? 'downloadingTitle' : 'syncingTitle',
                    message: isInitial ? 'downloadingMessage' : 'syncingMessage'
                });
                $winSyncWindow.open();
                
                console.log("start syncWithServer()");
                console.log("transactionLog sent = ");
                console.log(transactionLog.get());
                AD.Comm.syncWithServer(serverURL, transactionLog.get(), sUsername, sPassword).done(function(transactions) {
                    transactionLog.apply(transactions);
                    transactionLog.clear();
                }).fail(function() {
                    alert('Problem encountered when accessing the server. Please try again later.'); // move this one after closing the sync window
                }).always(function() {
                    $winSyncWindow.close();
                });
            });
        });
        console.log("DEBUG controller > Left performWholeSyncProcess()");
    }
};