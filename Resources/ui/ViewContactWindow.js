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
            var $winAddContactWindow = new AD.UI.AddContactWindow({
                tab: this.tab,
                operation: 'edit',
                existingContact: this.contact
            });
        },
        rightNavButton: true
    }, {
        title: 'del',
        callback: function() {
            AD.UI.yesNoAlert('contactDeleteConfirmation').done(this.proxy(function() {
                // The user chose "Yes", so close the window and delete the contact
                this.dfd.reject();
                this.contact.destroy();
            }));
        },
        platform: 'Android'
    }]
}, {
    init: function(options) {
        this.contact = this.options.contact;
        
        // Initialize the base $.Window object
        this._super({
            title: 'viewContact',
            autoOpen: true
        });
        
        this.smartBind(this.contact, 'updated.attr', function(property, value) {
            // Re-initialize the name label and contact buttons
            this.initialize();
            
            // Simulate a global model 'updated' event
            $(this.contact.constructor).trigger('updated', this.contact);
        });
    },
    
    // Create the child views
    create: function() {
        var contact = this.contact;
        
        // Show the contact's image if it exists
        var localContact = contact.contact_recordId === null ? null : Ti.Contacts.getPersonByID(contact.contact_recordId);
        var contactImage = localContact && localContact.getImage();
        var imageExists = contactImage ? true : false;
        if (imageExists) {
            var dimensions = AD.UI.getImageScaledDimensions(contactImage, AD.UI.contactImageSize);
            this.add('contactImage', Ti.UI.createImageView({
                left: AD.UI.padding,
                top: AD.UI.padding,
                width: dimensions.width,
                height: dimensions.height,
                image: contactImage
            }));
        }
        
        // Create the contact label
        this.add('nameLabel', Ti.UI.createLabel({
            left: AD.UI.padding + (imageExists ? AD.UI.contactImageSize.width : 0),
            top: AD.UI.padding,
            width: AD.UI.useableScreenWidth - (imageExists ? AD.UI.contactImageSize.width : 0),
            height: Ti.UI.SIZE,
            text: null,
            textAlign: 'center',
            font: AD.UI.Fonts.header
        }));
        
        var headerHeight = imageExists ? AD.UI.contactImageSize.height : 40;
        var bodyTop = headerHeight + AD.UI.padding * 2;
        
        // Create the contact button bar which allows the user to call, SMS, or e-mail the contact
        if (AD.Platform.isiOS) {
            // Create a button bar under iOS
            this.contactBBLabels = this.constructor.contactMethods.map(function(method) {
                return $.extend({
                    title: AD.Localize(method.label)
                }, method);
            });
            var contactBB = this.add('contactBB', Ti.UI.createButtonBar({
                left: AD.UI.padding,
                top: bodyTop,
                width: AD.UI.useableScreenWidth,
                height: AD.UI.buttonHeight,
                style: Ti.UI.iPhone.SystemButtonStyle.BAR,
                labels: this.contactBBLabels
            }));
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
        }
        else {
            // Create muliple buttons under any other platform
            
            // The buttons are spaced evenly and horizontally with AD.UI.padding units of padding between them
            var buttonCount = this.constructor.contactMethods.length;
            var buttonWidth = (AD.UI.useableScreenWidth - (buttonCount - 1) * AD.UI.padding) / buttonCount;
            this.constructor.contactMethods.forEach(function(method, index) {
                var button = this.add(method.label, Ti.UI.createButton($.extend({
                    left: AD.UI.padding + (buttonWidth + AD.UI.padding) * index,
                    top: bodyTop,
                    width: buttonWidth,
                    height: AD.UI.buttonHeight,
                    titleid: method.label
                }, method)));
                button.addEventListener('click', this.proxy(method.callback));
            }, this);
        }
        
        var _this = this;

        // Create the steps view
        var $stepsView = $.View.create(Ti.UI.createScrollView({
            left: 0,
            top: bodyTop + AD.UI.buttonHeight + AD.UI.padding,
            layout: 'vertical',
            scrollType: 'vertical',
            contentHeight: 'auto',
            showVerticalScrollIndicator: true
        }));
        var createRow = function() {
            return Ti.UI.createView({
                left: 0,
                top: 0,
                height: AD.UI.buttonHeight,
                borderWidth: 1,
                borderColor: 'black'
            });
        };

        // Create the tags row
        var tagsRow = $stepsView.add('tags', createRow());
        var tagsLabel = Ti.UI.createLabel({
            left: AD.UI.padding,
            top: 0,
            width: AD.UI.useableScreenWidth,
            height: Ti.UI.FILL,
            font: AD.UI.Fonts.mediumSmall
        });
        var updateTagLabel = function() {
            // Get an array of the lab
            var tagLabels = contact.getTags().map(function(tag) { return tag.attr('tag_label'); });
            tagsLabel.text = AD.Localize('tags')+': '+(tagLabels.join(', ') || AD.Localize('none'));
        };
        updateTagLabel();
        tagsRow.add(tagsLabel);
        tagsRow.addEventListener('click', function() {
            var $winChooseTags = new AD.UI.ChooseOptionsWindow({
                tab: _this.tab,
                groupName: 'tag',
                Model: 'Tag',
                initial: contact.getTags().map(function(tag) { return tag.attr('tag_guid'); }),
                editable: true
            });
            $winChooseTags.getDeferred().done(function(options) {
                contact.setTags(options);
                updateTagLabel();
            });
        });

        AD.Models.Step.cache.getArray().forEach(function(step) {
            // Lookup the associated with the contact
            var stepId = step.getId();
            var contactStep = contact.getStep(stepId);

            var $newRow = $.View.create(createRow());
            
            // Create the step title
            $newRow.add(Ti.UI.createLabel({
                left: AD.UI.padding,
                top: 0,
                width: AD.UI.useableScreenWidth,
                height: Ti.UI.FILL,
                text: step.getLabel(),
                font: AD.UI.Fonts.medium
            }));
            
            var stepCompletedDate = contactStep.attr('step_date');
            var stepCompleted = stepCompletedDate !== null;
            
            // Create the switch to toggle the step's completion status
            var $completedCheckbox = new AD.UI.Checkbox({
                createParams: {
                    right: AD.UI.padding
                },
                value: stepCompleted
            });
            var completedCheckbox = $completedCheckbox.getView();
            completedCheckbox.addEventListener('change', function(event) {
                // The step's completion state has been changed
                stepCompleted = event.value;
                stepCompletedDate = stepCompleted ? $.today() : null;
                contactStep.attr('step_date', stepCompletedDate).save();
                updateRow();
            });
            $newRow.add($completedCheckbox);
            
            // Create the button to set the step completion date
            var dateButton = Ti.UI.createButton({
                right: AD.UI.Checkbox.defaultSize + AD.UI.padding * 2,
                width: 90,
                height: AD.UI.buttonHeight,
                title: ''
            });
            dateButton.addEventListener('click', function() {
                // Set the completion date of the step
                AD.UI.DatePickerWindow.datePicker({
                    tab: _this.tab,
                    minDate: new Date(2012, 0, 1), // January 1, 2012
                    maxDate: $.today(),
                    initialDate: stepCompletedDate
                }).done(function(completedDate) {
                    stepCompletedDate = completedDate;
                    contactStep.attr('step_date', stepCompletedDate).save();
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
            
            $stepsView.add(stepId, $newRow);
        });
        this.add($stepsView);
    },
    
    // Initialize the child views
    initialize: function() {
        this.getChild('nameLabel').text = this.contact.getLabel();
        
        // Update the enabled status of each of the contact buttons
        
        // Extract the button array
        var buttons = AD.Platform.isiOS ? this.contactBBLabels : this.constructor.contactMethods.map(function(method) {
            return this.getChild(method.label);
        }, this);
        buttons.forEach(function(button) {
            button.enabled = this.contact.attr(button.field) ? true : false;
        }, this);
        if (AD.Platform.isiOS) {
            // Force the button bar to recognize the new button states
            this.getChild('contactBB').labels = buttons;
        }
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
