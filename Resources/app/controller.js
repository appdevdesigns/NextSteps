var AD = require('AppDev');
var $ = require('jquery');
var utils = require('app/utils');

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
        
        if (AD.Config.hasServer() && serverURL !== AD.PropertyStore.get('lastSyncServer')) {
            console.log("AD.PropertyStore = " + AD.PropertyStore);
            console.log("lastSyncServer = " + AD.PropertyStore.get('lastSyncServer'));
            console.log("serverURL = " + serverURL);
            this.performWholeSyncProcess(true);
        }
        
        var nextPromotion = new Date(AD.PropertyStore.get('nextPromotion'));
        if (new Date() >= nextPromotion) {
            AD.UI.alert('promoteStudentsMessage', ['yes', 'no', 'later']).done(function(buttonIndex) {
                if (buttonIndex === 0) {
                    // The user clicked "Yes"
                    controller.promoteStudents();
                }
                else if (buttonIndex === 1) {
                    // The user clicked "No"
                    controller.advancePromotionDate();
                }
                else if (buttonIndex === 2) {
                    // Do nothing if the user clicked "Later"
                    // The user will be prompted again during the next application launch
                }
            });
        }
        
        console.log("DEBUG controller > Left start()");
    },
    
    performPreSyncValidation: function() {
        console.log("DEBUG controller > Entered performPreSyncValidation()");
        var serverURL = AD.Config.getServer();
        
        if (!AD.Config.hasServer()) {
            alert(AD.Localize('syncErrorNoServer'));
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
            AD.Comm.pingServer(serverURL).done(callback).fail(function() {
                AD.UI.yesNoAlert('syncErrorPingFailed').done(function() {
                    // Try again
                    ping(callback);
                });
            });
        };
        
        console.log("start ping()");
        ping(function(apiConfig) {
            console.log('Successfully contacted server: ' + apiConfig.server);
            
            // Show login window
            // Check if pressing cancel will still continue to the login window
            var $winLoginWindow = new AD.UI.LoginWindow({
                validateCredentials: function(username, password) {
                    console.log('Attempting to authenticate...');
                    var validateDfd = $.Deferred();
                    AD.Comm.authenticate(apiConfig, username, password).done(function() {
                        validateDfd.resolve(true);
                    }).fail(function() {
                        validateDfd.resolve(false);
                    });
                    return validateDfd.promise();
                }
            });
            
            console.log("open $winLoginWindow()");
            $winLoginWindow.open();
            $winLoginWindow.getDeferred().done(function(credentials) {
                console.log('Login credentials are valid');
                require('ui/ActivityWindow');
                var $winSyncWindow = new AD.UI.ActivityWindow({
                    title: isInitial ? 'downloadingTitle' : 'syncingTitle',
                    message: isInitial ? 'downloadingMessage' : 'syncingMessage'
                });
                $winSyncWindow.setProgress(null);
                $winSyncWindow.open();
                
                console.log("start syncWithServer()");
                console.log("transactionLog sent = ");
                console.log(transactionLog.get());
                AD.Comm.syncWithServer(apiConfig, transactionLog.get(), credentials.username, credentials.password).done(function(transactions) {
                    transactionLog.clear();
                    transactionLog.pause();
                    $winSyncWindow.setMessage('updatingMessage');
                    transactionLog.apply(transactions, function(completed, total) {
                        $winSyncWindow.setProgress(completed, total);
                    });
                    transactionLog.resume();
                }).fail(function() {
                    alert(AD.Localize('syncErrorUnknown')); // move this one after closing the sync window
                }).always(function() {
                    $winSyncWindow.close();
                });
            });
        });
        console.log("DEBUG controller > Left performWholeSyncProcess()");
    },
    
    // Promote all students to the next year
    promoteStudents: function() {
        AD.Models.Contact.cache.getArray().forEach(function(contact) {
            var year = contact.attr('year_id');
            // For contacts who are freshmen through seniors, promote them to the next year
            if (year >= 2 && year <= 5) {
                contact.attr('year_id', year + 1);
                contact.save();
            }
        });
        
        controller.advancePromotionDate();
    },
    
    // Set the promotion date to the end of the school year
    advancePromotionDate: function() {
        AD.PropertyStore.set('nextPromotion', utils.schoolYearEnd());
    }
};
