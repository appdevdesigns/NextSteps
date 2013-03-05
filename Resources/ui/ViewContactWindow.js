var AD = require('AppDev');
var $ = require('jquery');

module.exports = $.Window('AppDev.UI.ViewContactWindow', {
    dependencies: ['AddContactWindow', 'DatePickerWindow', 'Checkbox'],
    
    contactMethods: [
        {label: 'contact_call', callback: 'callContact', field: 'contact_phone'},
        {label: 'contact_SMS', callback: 'SMSContact', field: 'contact_phone'},
        {label: 'contact_email', callback: 'emailContact', field: 'contact_email'}
    ],
    actions: [{
        title: 'edit',
        callback: function() {
            // Open the EditContact window
            var $winAddContactWindow = new AD.UI.AddContactWindow({tab: this.options.tab, operation: 'edit', existingContact: this.contact});
        },
        rightNavButton: true
    }]
}, {
    init: function(options) {
        this.contact = this.options.contact;
        this.contactModified = false;
        
        // Initialize the base $.Window object
        this._super({
            title: 'viewContact',
            tab: this.options.tab,
            autoOpen: true
        });
        
        var contact = this.contact;
        this.addEventListener('close', function() {
            if (this.contactModified) {
                // When the window is closed, if any of the contact's attributes have changed, save the updated contact information to the database
                contact.save();
            }
        });
        
        this.smartBind(contact, 'updated.attr', function(property, value) {
            // Update the name label in case the name changed
            this.getChild('nameLabel').text = this.contact.getLabel();
            
            // Simulate a global model 'updated' event
            $(contact.constructor).trigger('updated', contact);
        });
    },
    
    // Create the child views
    create: function() {
        var contact = this.contact;
        
        // Show the contact's image if it exists
        var localContact = Ti.Contacts.getPersonByID(contact.contact_recordId);
        var contactImage = localContact && localContact.getImage();
        var imageExists = contactImage ? true : false;
        if (imageExists) {
            var dimensions = AD.UI.getImageScaledDimensions(contactImage, AD.UI.contactImageSize);
            this.add('contactImage', Ti.UI.createImageView({
                left: 10,
                top: 10,
                width: dimensions.width,
                height: dimensions.height,
                image: contactImage
            }));
        }
        
        // Create the contact label 
        var nameLabel = this.add('nameLabel', Ti.UI.createLabel({
            left: 10 + (imageExists ? AD.UI.contactImageSize.width : 0),
            top: 10,
            width: AD.UI.useableScreenWidth - (imageExists ? AD.UI.contactImageSize.width : 0),
            height: 27,
            text: null,
            textAlign: 'center',
            font: AD.UI.Fonts.header
        }));
        
        var headerHeight = imageExists ? AD.UI.contactImageSize.height : 40;
        var bodyTop = headerHeight + 10;
        
        // Create the contact button bar which allows the user to call, SMS, or e-mail the contact
        if (AD.Platform.isiOS) {
            // Create a button bar under iOS
            var labels = this.constructor.contactMethods.map(function(method) {
                return {
                    title: L(method.label),
                    enabled: contact.attr(method.field) !== null
                };
            });
            var contactBB = Titanium.UI.createButtonBar({
                left: 10,
                top: bodyTop,
                style: Titanium.UI.iPhone.SystemButtonStyle.BAR,
                height: AD.UI.buttonHeight,
                width: AD.UI.useableScreenWidth
            });
            this.addEventListener('open', function() {
                // Set the labels AFTER the window opens because of a bug in Titanium
                // See http://developer.appcelerator.com/question/124468/how-to-disable-buttons-in-tabbed-bar
                contactBB.labels = labels;
            });
            
            contactBB.addEventListener('click', this.proxy(function(event) {
                var callbackName = this.constructor.contactMethods[event.index].callback;
                // callbackName will be undefined if event.index is null
                // because the user clicked the button bar, but not a button
                if (typeof callbackName !== 'undefined') {
                    // Determine the proper callback to use and call it
                    var callback = $.isFunction(callback) ? callback : this[callbackName];
                    callback.call(this);
                }
            }));
            this.add(contactBB);
        }
        else {
            // Create muliple buttons under any other platform
            
            // Allow the user to call the contact
            var callButton = Ti.UI.createButton({
                top: bodyTop,
                left: 10,
                width: AD.UI.useableScreenWidth / 3 - 10,
                height: AD.UI.buttonHeight,
                titleid: 'contact_call'
            });
            callButton.addEventListener('click', this.proxy('callContact'));
            this.add(callButton);
            
            // Allow the user to text the contact
            var SMSButton = Ti.UI.createButton({
                top: bodyTop,
                left: 15 + AD.UI.useableScreenWidth / 3,
                width: AD.UI.useableScreenWidth / 3 - 10,
                height: AD.UI.buttonHeight,
                titleid: 'contact_SMS'
            });
            SMSButton.addEventListener('click', this.proxy('SMSContact'));
            this.add(SMSButton);
            
            // Allow the user to email the contact
            var emailButton = Ti.UI.createButton({
                top: bodyTop,
                left: 20 + AD.UI.useableScreenWidth / 3 * 2,
                width: AD.UI.useableScreenWidth / 3 - 10,
                height: AD.UI.buttonHeight,
                titleid: 'contact_email'
            });
            emailButton.addEventListener('click', this.proxy('emailContact'));
            this.add(emailButton);
        }
        
        // Create the steps view
        var $stepsView = $.View.create(Ti.UI.createScrollView({
            top: bodyTop + 40,
            left: 0,
            scrollType: 'vertical',
            contentHeight: 'auto',
            showVerticalScrollIndicator: true
        }));
        var rowCount = 0;
        var _this = this;
        $.each(AD.Models.Contact.steps, function(stepName, stepFieldName) {
            var $newRow = $.View.create(Ti.UI.createView({
                left: 0,
                top: rowCount * 40,
                height: 40,
                borderWidth: 1,
                borderColor: 'black'
            }));
            ++rowCount;
            
            // Create the step title
            $newRow.add(Ti.UI.createLabel({
                top: 5,
                left: 10,
                width: AD.UI.useableScreenWidth,
                height: 'auto',
                text: L('step_'+stepName),
                font: AD.UI.Fonts.medium
            }));
            
            var stepCompletedDate = contact.attr(stepFieldName);
            var stepCompleted = stepCompletedDate !== null;
            
            // Create the switch to toggle the step's completion status
            var $completedCheckbox = new AD.UI.Checkbox({
                createParams: {
                    left: 10 + AD.UI.useableScreenWidth - AD.UI.Checkbox.defaultSize
                },
                value: stepCompleted
            });
            var completedCheckbox = $completedCheckbox.getView();
            completedCheckbox.addEventListener('change', function(event) {
                // The step's completion state has been changed
                stepCompleted = event.value;
                stepCompletedDate = stepCompleted ? $.today() : null;
                contact.attr(stepFieldName, stepCompletedDate);
                _this.contactModified = true;
                updateRow();
            });
            $newRow.add($completedCheckbox);
            
            // Create the button to set the step completion date
            var dateButton = Ti.UI.createButton({
                left: 10 + AD.UI.useableScreenWidth - 130,
                top: 5,
                width: 90,
                height: AD.UI.buttonHeight,
                title: ''
            });
            dateButton.addEventListener('click', function() {
                // Set the completion date of the step
                AD.UI.DatePickerWindow.datePicker({
                    tab: _this.options.tab,
                    minDate: new Date(2012, 0, 1), // January 1, 2012
                    maxDate: $.today(),
                    initialDate: stepCompletedDate
                }).done(function(completedDate) {
                    stepCompletedDate = completedDate;
                    contact.attr(stepFieldName, stepCompletedDate);
                    _this.contactModified = true;
                    updateRow();
                });
            });
            $newRow.add(dateButton);
            
            // Update the checkbox image and the title and visibility of the dateButton
            var updateRow = function() {
                if (stepCompleted) {
                    dateButton.visible = true;
                    dateButton.title = $.formatDate(stepCompletedDate);
                }
                else {
                    dateButton.visible = false;
                }
            };
            updateRow();
            
            $stepsView.add(stepFieldName, $newRow);
        });
        this.add($stepsView);
    },
    
    // Initialize the child views
    initialize: function() {
        this.getChild('nameLabel').text = this.contact.getLabel();
    },
    
    // Helper functions that allow the user to contact the contact via telephone, SMS, or e-mail
    callContact: function() {
        // Remove all non-numeric numbers from the phone number
        var strippedPhoneNumber = this.contact.contact_phone.replace(/\D/g, '');
        Ti.Platform.openURL('tel:'+strippedPhoneNumber); // tel:xxxxxxxx format
        if (AD.Platform.isiOS) {
            Ti.App.iOS.registerBackgroundService({ url: 'Return.js' });
        }
    },
    SMSContact: function() {
        // Remove all non-numeric numbers from the phone number
        var strippedPhoneNumber = this.contact.contact_phone.replace(/\D/g, '');
        Ti.Platform.openURL('sms:'+strippedPhoneNumber); // sms:xxxxxxxx format
    },
    emailContact: function() {
        // Display the email dialog
        var emailDialog = Ti.UI.createEmailDialog({
            toRecipients: [this.contact.contact_email]
        });
        emailDialog.open();
    }
});
