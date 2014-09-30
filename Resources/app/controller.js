var AD = require('AppDev');
var $ = require('jquery');
var utils = require('app/utils');

var controller = module.exports = {
    // This will be called by app.js once the initialization is finished
    start: function() {
        console.log('DEBUG controller > Entered start()');
        
        require('app/Transactions');
        AD.Transactions.initialize({
            fileName: 'TransactionLog.json',
            syncedModels: ['Contact', 'Campus', 'Step', 'ContactStep']
        });
        
        var serverURL = AD.Config.getServer();
        
        if (AD.EncryptionKey.encryptionActivated() && AD.Config.hasServer() && serverURL !== AD.PropertyStore.get('lastSyncServer')) {
            console.log('AD.PropertyStore = ' + AD.PropertyStore);
            console.log('lastSyncServer = ' + AD.PropertyStore.get('lastSyncServer'));
            console.log('serverURL = ' + serverURL);
            this.initiateSync(true);
        }
        
        if (controller.isPromotionPending()) {
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
        
        console.log('DEBUG controller > Left start()');
    },
    
    syncWithNSS: function() {
        if (!AD.EncryptionKey.encryptionActivated()) {
            AD.UI.yesNoAlert(AD.localize('syncErrorUnencrypted')).done(function() {
                // Because the database module does not support enabling and disabling
                // encryption, we must backup the data, delete the database file,
                // setup database encryption, and restore the data.
                var dbName = AD.Defaults.dbName;
                AD.Database.export(dbName).done(function(databaseDump) {
                    AD.Database.DataStore.closeDatabase(dbName);
                    
                    var databaseFile = AD.Database.getFile();
                    if (databaseFile.exists()) {
                        databaseFile.deleteFile();
                    }
                    
                    AD.Auth.choosePassword().done(function() {
                        // Now that encryption is activiated, write out the property store, which
                        // will be encrypted now
                        AD.PropertyStore.write();
                        AD.Auth.choosePIN().done(function() {
                            // Now import the data back into the database
                            AD.Database.install(dbName);
                            AD.Database.import(dbName, databaseDump);
                            controller.syncWithNSS();
                        });
                    });
                });
            });
        }
        else if (!AD.Config.hasServer()) {
            alert(AD.localize('syncErrorNoServer'));
        }
        else {
            this.initiateSync(false);
        }
    },
    
    // This will perform the following: check if server URL is supplied & ping with server, authenticate user, and sync with server if authentication is successful. If not, the user will be directed to the contacts page and operate in offline mode.
    initiateSync: function(isInitial) {
        console.log('DEBUG controller > Entered initiateSync()');
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
        
        console.log('start ping()');
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
            
            console.log('open $winLoginWindow()');
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
                
                console.log('start syncWithServer()');
                console.log('transactionLog sent = ');
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
                    alert(AD.localize('syncErrorUnknown')); // move this one after closing the sync window
                }).always(function() {
                    $winSyncWindow.close();
                });
            });
        });
        console.log('DEBUG controller > Left initiateSync()');
    },
    
    // Determine whether or not a promotion is pending that has not yet been acted upon
    isPromotionPending: function() {
        return new Date() >= new Date(AD.PropertyStore.get('nextPromotion'));
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
    },
    
    // Get and set the end of the school year
    // The end of the school year is encoded as a dictionary with "date" and "month" properties
    // For example: { date: 1, month: 5 } refers to June 1st
    getSchoolYearEnd: function() {
        return AD.PropertyStore.get('schoolYearEnd');
    },
    setSchoolYearEnd: function(schoolYearEnd) {
        AD.PropertyStore.set('schoolYearEnd', schoolYearEnd);
        
        // Update the next promotion date, preserving whether or not a promotion is pending
        var nextPromotionNew = utils.schoolYearEnd();
        if (controller.isPromotionPending()) {
            // A promotion was previous pending, so decrement the upcoming promotion year to
            // ensure that the promotion will still be pending after changing the promotion date
            nextPromotionNew.setFullYear(nextPromotionNew.getFullYear() - 1);
        }
        AD.PropertyStore.set('nextPromotion', nextPromotionNew);
    }
};
