var AD = require('AppDev');
var $ = require('jquery');
var controller = require('app/controller');

module.exports = $.Window('AppDev.UI.AppToolsWindow', {
    dependencies: ['GoogleDriveChooseFileWindow', 'StringPromptWindow', 'PasswordPromptWindow', 'DatePickerWindow']
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
                height: AD.UI.buttonHeight,
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
                title: 'stringPromptBackupNameTitle',
                message: 'stringPromptBackupNameMessage',
                initial: defaultTitle
            }).getDeferred().done(function(backupTitle) {
                AD.Database.export(AD.Defaults.dbName).done(function(dump) {
                    // Prompt the user for the database encryption password
                    var passwordDfd = $.Deferred();
                    AD.UI.yesNoAlert('backupAskEncrypt').done(function() {
                        _this.createWindow('StringPromptWindow', {
                            title: 'stringPromptBackupPasswordTitle',
                            message: 'stringPromptBackupPasswordMessage',
                            initial: AD.Platform.isiOS ? null : AD.EncryptionKey.get() || null
                        }).getDeferred().done(passwordDfd.resolve);
                    }).fail(function() {
                        passwordDfd.resolve(null);
                    });
                    
                    passwordDfd.done(function(password) {
                        // Flag whether or not this database contains potentially sensitive information
                        dump.encrypted = AD.EncryptionKey.encryptionActivated();
                        
                        var dumpContent = JSON.stringify(dump);
                        if (password !== null) {
                            // Use the passowrd to encrypt the database dump
                            dumpContent = AD.sjcl.encrypt(password, dumpContent);
                            
                            var encryptedDump = JSON.parse(dumpContent);
                            encryptedDump.passwordHash  = AD.EncryptionKey.hash(password);
                            dumpContent = JSON.stringify(encryptedDump);
                        }
                        
                        // Create a file on Google Drive containing the database dump content
                        AD.Comm.GoogleDriveFileAPI.write({
                            content: dumpContent,
                            metadata: {
                                title: backupTitle,
                                mimeType: 'application/json',
                                parents: ['root']
                            }
                        });
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
                AD.Comm.GoogleDriveFileAPI.read(fileId, function(dump) {
                    var restoreDatabases = function(dump) {
                        AD.UI.yesNoAlert('restoreDatabaseWarning').done(function() {
                            AD.Database.import(AD.Defaults.dbName, dump).done(function() {
                                AD.Model.refreshCaches().done(AD.UI.initialize);
                            });
                        });
                    };
                    
                    var decryptDfd = $.Deferred();
                    if (dump.passwordHash) {
                        _this.createWindow('PasswordPromptWindow', {
                            title: 'stringPromptBackupPasswordTitle',
                            message: 'stringPromptBackupPasswordMessage',
                            passwordHash: dump.passwordHash
                        }).getDeferred().done(function(password) {
                            // Convert the database dump into a JSON string, decrypt it, then convert it back into JSON
                            delete dump.passwordHash;
                            var decryptedDump = JSON.parse(AD.sjcl.decrypt(password, JSON.stringify(dump)));
                            decryptDfd.resolve(decryptedDump);
                        });
                    }
                    else {
                        decryptDfd.resolve(dump);
                    }
                    
                    decryptDfd.done(function(dump) {
                        if (dump.encrypted !== false && !AD.EncryptionKey.encryptionActivated()) {
                            AD.UI.yesNoAlert('restoreDatabaseInsecure').done(function() {
                                controller.reencryptDatabases().done(function(dump) {
                                    restoreDatabases(dump);
                                });
                            });
                        }
                        else {
                            restoreDatabases(dump);
                        }
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
            controller.syncWithNSS();
        });
        
        
        this.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            right: AD.UI.padding,
            top: AD.UI.padding * 2,
            height: Ti.UI.SIZE,
            textid: 'schoolYearInfoText',
            font: AD.UI.Fonts.mediumSmall
        }));
        var schoolYearView = this.add(Ti.UI.createView({
            top: 0,
            left: 0,
            width: Ti.UI.FILL,
            height: Ti.UI.SIZE
        }));
        
        var schoolYearEndButton = Ti.UI.createButton({
            top: AD.UI.padding,
            left: AD.UI.padding * 2,
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'schoolYearEnd'
        });
        schoolYearView.add(schoolYearEndButton);
        schoolYearEndButton.addEventListener('click', function() {
            // Set the end of the school year
            var currentYear = new Date().getFullYear();
            var schoolYearEnd = controller.getSchoolYearEnd();
            _this.createWindow('DatePickerWindow', {
                minDate: new Date(currentYear, 0, 1), // January 1
                maxDate: new Date(currentYear, 11, 31), // December 31
                initialDate: new Date(currentYear, schoolYearEnd.month, schoolYearEnd.date)
            }).getDeferred().done(function(schoolYearEndDate) {
                controller.setSchoolYearEnd({
                    date: schoolYearEndDate.getDate(),
                    month: schoolYearEndDate.getMonth()
                });
            });
        });
        
        var promoteStudentsButton = Ti.UI.createButton({
            top: AD.UI.padding,
            right: AD.UI.padding * 2,
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'promoteStudents'
        });
        schoolYearView.add(promoteStudentsButton);
        promoteStudentsButton.addEventListener('click', function() {
            AD.UI.yesNoAlert('promoteStudentsConfirmation').done(function() {
                controller.promoteStudents();
            });
        });
    }
});
