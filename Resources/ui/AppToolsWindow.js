var AD = require('AppDev');
var $ = require('jquery');

module.exports = $.Window('AppDev.UI.AppToolsWindow', {
    dependencies: ['GoogleDriveChooseFileWindow', 'StringPromptWindow', 'ProgressWindow']
}, {
    init: function(options) {
        // Initialize the base $.Window object
        this._super({
            title: 'toolsTitle',
            createParams: {
                layout: 'vertical'
            }
        });
    },

    // Create the child views
    create: function() {
        if (AD.Platform.isAndroid) {
            var preferencesButton = this.add(Ti.UI.createButton({
                top: AD.UI.padding,
                center: {
                    x: AD.UI.screenWidth / 2
                },
                width: 160,
                height: AD.UI.SIZE,
                titleid: 'preferences'
            }));
            preferencesButton.addEventListener('click', function() {
                Ti.UI.Android.openPreferences();
            });
        }

        this.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            top: AD.Platform.isAndroid ? AD.UI.padding * 2 : AD.UI.padding,
            width: AD.UI.SIZE,
            height: AD.UI.SIZE,
            textid: 'backupRestoreInfoText',
            font: AD.UI.Fonts.mediumSmall
        }));

        var _this = this;
        var backupButton = this.add('backup', Ti.UI.createButton({
            top: AD.UI.padding,
            center: {
                x: AD.UI.screenWidth / 2
            },
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'backupDatabase'
        }));
        backupButton.addEventListener('click', function() {
            // Calculate the default backup title
            var today = new Date();
            var defaultTitle = $.formatString('backupTitleFormat',
                ('0' + (today.getMonth() + 1)).slice(-2),
                ('0' + today.getDate()).slice(-2),
                today.getFullYear());

            // Prompt the user for the name of the database backup file
            _this.createWindow('StringPromptWindow', {
                title: 'stringPromptBackupTitle',
                message: 'stringPromptBackupMessage',
                initial: defaultTitle
            }).getDeferred().done(function(backupTitle) {
                AD.Database.export(AD.Defaults.dbName).done(function(dump) {
                    AD.Comm.GoogleDriveFileAPI.write({
                        content: JSON.stringify(dump),
                        metadata: {
                            title: backupTitle,
                            mimeType: 'application/json',
                            parents: ['root']
                        }
                    });
                });
            });
        });

        var restoreButton = this.add('restore', Ti.UI.createButton({
            top: AD.UI.padding,
            center: {
                x: AD.UI.screenWidth / 2
            },
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'restoreDatabase'
        }));
        restoreButton.addEventListener('click', function() {
            // Let the user choose the file to restore from
            _this.createWindow('GoogleDriveChooseFileWindow', {
                type: 'file',
                folder: null
            }).getDeferred().done(function(fileId) {
                AD.UI.yesNoAlert('restoreDatabaseWarning').done(function() {
                    AD.Comm.GoogleDriveFileAPI.read(fileId, function(dump) {
                        AD.Database.import(AD.Defaults.dbName, JSON.parse(dump));
                    });
                });
            });
        });

        var syncButton = this.add('sync', Ti.UI.createButton({
            top: AD.UI.padding * 2,
            center: {
                x: AD.UI.screenWidth / 2
            },
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'sync'
        }));
        syncButton.addEventListener('click', function() {
            var $winSyncingWindow = new AD.UI.ProgressWindow({
                title: 'Syncing',
                message: 'Syncing with the server...'
            });
            $winSyncingWindow.open();
            
            require('app/Transactions');
            var transactionLog = new AD.Transactions({
                fileName: 'TransactionLog.json',
                syncedModels: ['Contact', 'Campus', 'Step', 'ContactStep']
            });
            AD.Comm.syncWithServer(AD.Config.getServer(), transactionLog.get()).done(function() {
                transactionLog.clear();
            }).fail(function() {
                alert('Could not access the server!');
                console.log('DEBUG >> SyncButton: failure');
            }).always(function() {
                $winSyncingWindow.close();
            });
        });

    }
});
