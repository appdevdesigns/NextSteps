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
    // Show instructions for how to transfer data from the old NextSteps app just one time
    if (!Ti.App.Properties.getBool('dataTransferInstructionsShown', false)) {
        alert($.formatString('dataTransferInstructions', AD.Defaults.feedbackAddress));
        Ti.App.Properties.setBool('dataTransferInstructionsShown', true);
    }
    
    var controller = require('app/controller');
    controller.start();
});
