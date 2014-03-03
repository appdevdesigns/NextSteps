var AD = require('AppDev');
var $ = require('jquery');

var LoginWindow = module.exports = $.Window('AppDev.UI.LoginWindow', {}, {
    init: function(options) {
        // Initialize the base $.Window object
        this._super({
            title: 'login',
            modal: true,
            focusedChild: 'username'
        });
    },

    // Create the child views
    create: function() {
        // Create the user ID label and text field
        this.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            top: AD.UI.padding,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE,
            textid: 'userId'
        }));
        this.add('username', Ti.UI.createTextField({
            left: 110,
            top: AD.UI.padding,
            width: 180,
            height: AD.UI.textFieldHeight,
            hintText: AD.Localize('userId'),
            autocorrect: false,
            autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE,
            borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
        }));
        
        // Create the password label and text field
        this.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            top: 70,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE,
            textid: 'password'
        }));
        var passwordField = this.add('password', Ti.UI.createTextField({
            left: 110,
            top: 70,
            width: 180,
            height: AD.UI.textFieldHeight,
            passwordMask: true,
            hintText: AD.Localize('password'),
            borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
        }));
        passwordField.addEventListener('return', this.proxy('submit'));
        
        // Create the submit and cancel buttons
        var buttonWidth = AD.UI.useableScreenWidth * 0.4;
        var submit = this.add(Ti.UI.createButton({
            left: AD.UI.padding,
            top: 120,
            width: buttonWidth,
            height: AD.UI.buttonHeight,
            titleid: 'submit'
        }));
        submit.addEventListener('click', this.proxy('submit'));
        var cancel = this.add(Ti.UI.createButton({
            right: AD.UI.padding,
            top: 120,
            width: buttonWidth,
            height: AD.UI.buttonHeight,
            titleid: 'cancel'
        }));
        cancel.addEventListener('click', this.dfd.reject);
    },
    
    // Called when the user submits their login credentials
    submit: function() {
        var _this = this;
        var username = this.getChild('username').value;
        var password = this.getChild('password').value;
        var validateDfd = this.options.validateCredentials(username, password);
        validateDfd.then(function() {
            _this.dfd.resolve({});
        }, function() {
            alert("You have entered an invalid username or password! Please try again.");
        });
    }
});
