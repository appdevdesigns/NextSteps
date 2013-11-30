var AD = require('AppDev');
var $ = require('jquery');

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
        this.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            top: AD.UI.padding,
            width: AD.UI.SIZE,
            height: AD.UI.SIZE,
            textid: 'backupRestoreInfoText',
            font: AD.UI.Fonts.mediumSmall
        }));
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
            var $winStringPrompt = new AD.UI.StringPromptWindow({
                title: 'stringPromptBackupTitle',
                message: 'stringPromptBackupMessage',
                initial: defaultTitle
            });
            $winStringPrompt.getDeferred().done(function(backupTitle) {
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
            AD.UI.yesNoAlert('restoreDatabaseWarning').done(function() {
                // Let the user choose the file to restore from
                var $winChooseFile = new AD.UI.GoogleDriveChooseFileWindow({
                    type: 'file',
                    folder: null
                });
                $winChooseFile.getDeferred().done(function(fileId) {
                    AD.Comm.GoogleDriveFileAPI.read(fileId, function(dump) {
                        AD.Database.import(AD.Defaults.dbName, JSON.parse(dump));
                    });
                });
            });
        });
    }
});
