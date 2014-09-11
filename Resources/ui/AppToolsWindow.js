var AD = require('AppDev');
var $ = require('jquery');
var controller = require('app/controller');  

module.exports = $.Window('AppDev.UI.AppToolsWindow', {
    dependencies: ['GoogleDriveChooseFileWindow', 'StringPromptWindow']
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
                height: Ti.UI.SIZE,
                titleid: 'preferences'
            }));
            preferencesButton.addEventListener('click', function() {
                Ti.UI.Android.openPreferences();
            });
        }
        
        this.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            right: AD.UI.padding,
            top: AD.Platform.isAndroid ? AD.UI.padding * 2 : AD.UI.padding,
            height: Ti.UI.SIZE,
            textid: 'backupRestoreInfoText',
            font: AD.UI.Fonts.mediumSmall
        }));
        
        var _this = this;
        var backupRestoreView = this.add(Ti.UI.createView({
            top: 0,
            left: 0,
            width: Ti.UI.FILL,
            height: Ti.UI.SIZE
        }));
        var backupButton = this.record('backup', Ti.UI.createButton({
            top: AD.UI.padding,
            left: AD.UI.padding * 2,
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'backupDatabase'
        }));
        backupRestoreView.add(backupButton);
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
        
        var restoreButton = this.record('restore', Ti.UI.createButton({
            top: AD.UI.padding,
            right: AD.UI.padding * 2,
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'restoreDatabase'
        }));
        backupRestoreView.add(restoreButton);
        restoreButton.addEventListener('click', function() {
            // Let the user choose the file to restore from
            _this.createWindow('GoogleDriveChooseFileWindow', {
                type: 'file',
                folder: null
            }).getDeferred().done(function(fileId) {
                AD.UI.yesNoAlert('restoreDatabaseWarning').done(function() {
                    AD.Comm.GoogleDriveFileAPI.read(fileId, function(dump) {
                        AD.Database.import(AD.Defaults.dbName, dump).done(function() {
                            AD.Model.refreshCaches().done(AD.UI.initialize);
                        });
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
            controller.performPreSyncValidation();
        });
        
        var promoteStudentsButton = this.add('promoteStudents', Ti.UI.createButton({
            top: AD.UI.padding * 2,
            center: {
                x: AD.UI.screenWidth / 2
            },
            width: 120,
            height: AD.UI.promoteStudents,
            titleid: 'promoteStudents'
        }));
        promoteStudentsButton.addEventListener('click', function() {
            AD.UI.yesNoAlert('promoteStudentsConfirmation').done(function() {
                controller.promoteStudents();
            });
        });
    }
});
