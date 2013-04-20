// Modified version of example app on Github at https://github.com/dbankier/CoreTelephony-for-Appcelerator-Titanium/blob/master/example/bg.js

var core = require('com.yydigital.coretelephony');

// Check call state every second
var timer = setInterval(function() {
    // Get the array of current calls
    var outstandingCalls = core.getCurrentCalls();
    console.log('outstandingCalls: '+outstandingCalls);
    if (!outstandingCalls) {
        // Popup one second after ALL calls have ended
        var notification = Ti.App.iOS.scheduleLocalNotification({
            alertBody: 'returnToApp',
            alertAction: 'OK',
            date: new Date(Date.now() + 1000)
        });
        clearInterval(timer);
        Ti.App.currentService.unregister();
    }
}, 1000);
