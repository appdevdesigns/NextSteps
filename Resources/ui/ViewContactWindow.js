var AD = require('AppDev');
var $ = require('jquery');

module.exports = $.Window('AppDev.UI.ViewContactWindow', {
    dependencies: ['AddContactWindow', 'DatePickerWindow', 'Checkbox'],
    
    rowHeight: AD.UI.buttonHeight,
    
    contactMethods: [
        {label: 'contact_call', callback: 'callContact', field: 'contact_phone'},
        {label: 'contact_SMS', callback: 'SMSContact', field: 'contact_phone'},
        {label: 'contact_email', callback: 'emailContact', field: 'contact_email'}
    ],
    actions: [{
        title: 'del',
        callback: function() {
            AD.UI.yesNoAlert('contactDeleteConfirmation').done(this.proxy(function() {
                // The user chose "Yes", so close the window and delete the contact
                this.dfd.reject();
                this.contact.destroy();
            }));
        },
        platform: 'Android',
        showAsAction: true,
        icon: '/images/ic_action_discard.png'
    }, {
        title: 'edit',
        callback: function() {
            // Open the EditContact window
            var _this = this;
            var $winEditContact = this.createWindow('AddContactWindow', {
                operation: 'edit',
                existingContact: this.contact
            });
            $winEditContact.getDeferred().done(function() {
                // Update the steps view after the contact is edited
                _this.updateSteps();
            });
        },
        rightNavButton: true,
        showAsAction: true,
        icon: '/images/ic_action_edit.png'
    }]
}, {
    init: function(options) {
        this.contact = this.options.contact;
        
        // Initialize the base $.Window object
        this._super({
            title: 'viewContact',
            autoOpen: true,
            createParams: {
                layout: 'vertical'
            }
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
        
        // Create a container to hold the label and optional image
        var headerView = this.add(Ti.UI.createView({
            left: AD.UI.padding,
            top: AD.UI.padding,
            width: AD.UI.useableScreenWidth,
            height: Ti.UI.SIZE
        }));
        
        // Show the contact's image if it exists
        var localContact = contact.contact_recordId === null ? null : Ti.Contacts.getPersonByID(contact.contact_recordId);
        var contactImage = localContact && localContact.getImage();
        var hasImage = contactImage ? true : false;
        if (hasImage) {
            var dimensions = AD.UI.getImageScaledDimensions(contactImage, AD.UI.contactImageSize);
            headerView.add(Ti.UI.createImageView({
                left: 0,
                width: dimensions.width,
                height: dimensions.height,
                image: contactImage
            }));
        }
        
        // Create the contact label
        headerView.add(this.record('nameLabel', Ti.UI.createLabel({
            left: hasImage ? AD.UI.contactImageSize.width : 0,
            top: 0,
            text: null,
            textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
            width: Ti.UI.FILL,
            font: AD.UI.Fonts.header
        })));
        
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
                top: AD.UI.padding * 2,
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
            // Create multiple buttons under any other platform
            
            // The buttons are spaced evenly and horizontally with AD.UI.padding units of padding between them
            var buttonCount = this.constructor.contactMethods.length;
            var buttonWidth = (AD.UI.useableScreenWidth - (buttonCount - 1) * AD.UI.padding) / buttonCount;
            var contactButtonView = this.add(Ti.UI.createView({
                left: AD.UI.padding,
                top: AD.UI.padding * 2,
                width: AD.UI.useableScreenWidth,
                height: AD.UI.buttonHeight
            }));
            this.constructor.contactMethods.forEach(function(method, index) {
                var buttonParams = $.extend({
                    left: (buttonWidth + AD.UI.padding) * index,
                    width: buttonWidth,
                    height: AD.UI.buttonHeight,
                    titleid: method.label
                }, method);
                var button = this.record(method.label, Ti.UI.createButton(buttonParams));
                contactButtonView.add(button);
                button.addEventListener('click', this.proxy(method.callback));
            }, this);
        }
        
        // Create the tags row
        var _this = this;
        var tagsRow = this.add('tags', Ti.UI.createView({
            left: 0,
            top: 0,
            height: this.constructor.rowHeight
        }));
        tagsRow.top = AD.UI.padding;
        tagsRow.add(Ti.UI.createImageView({
            left: AD.UI.padding,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE,
            image: '/images/tags.png'
        }));
        var tagsLabel = Ti.UI.createLabel({
            left: AD.UI.padding * 2 + 25,
            right: AD.UI.padding,
            top: 0,
            height: Ti.UI.FILL,
            font: AD.UI.Fonts.mediumSmall
        });
        var updateTagLabel = function() {
            // Get an array of the lab
            var tagLabels = contact.getTags().map(function(tag) { return tag.attr('tag_label'); });
            tagsLabel.text = (tagLabels.join(', ') || AD.Localize('none'));
        };
        updateTagLabel();
        tagsRow.add(tagsLabel);
        tagsRow.addEventListener('click', function() {
            _this.createWindow('ChooseOptionsWindow', {
                groupName: 'tag',
                Model: 'Tag',
                initial: contact.getTags().map(function(tag) { return tag.attr('tag_uuid'); }),
                editable: true
            }).getDeferred().done(function(options) {
                contact.setTags(options);
                updateTagLabel();
            });
        });
        
        // Create the campus steps view
        var scrollableStepsView = Ti.UI.createScrollView({
            left: 0,
            top: 0,
            layout: 'vertical',
            scrollType: 'vertical',
            contentHeight: 'auto',
            showVerticalScrollIndicator: true
        });
        this.add(scrollableStepsView);
        
        var $campusStepsView = this.record('campusSteps', $.View.create(Ti.UI.createView({
            left: 0,
            top: 0,
            width: Ti.UI.FILL,
            height: Ti.UI.SIZE,
            layout: 'vertical'
        })));
        scrollableStepsView.add($campusStepsView.getView());
        
        var personalStepsHeaderRow = Ti.UI.createView({
            left: 0,
            top: 0,
            width: Ti.UI.FILL,
            height: Ti.UI.SIZE,
            backgroundColor: 'lightgray'
        });
        personalStepsHeaderRow.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            top: AD.UI.padding,
            bottom: AD.UI.padding,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE,
            textid: 'personalSteps'
        }));
        personalStepsHeaderRow.addEventListener('click', function() {
            _this.addPersonalSteps();
        });
        scrollableStepsView.add(personalStepsHeaderRow);
        
        // Create the personal steps view
        var $personalStepsView = this.record('personalSteps', $.View.create(Ti.UI.createView({
            left: 0,
            top: 0,
            width: Ti.UI.FILL,
            height: Ti.UI.SIZE,
            layout: 'vertical'
        })));
        scrollableStepsView.add($personalStepsView.getView());
    },
    
    // Initialize the child views
    initialize: function() {
        this.getChild('nameLabel').text = this.contact.getLabel();
        
        this.updateSteps();
        
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
    
    // Create and return a basic UI element representing a row
    createRow: function() {
        return Ti.UI.createView({
            left: 0,
            top: 0,
            height: this.constructor.rowHeight,
            borderWidth: 1,
            borderColor: 'black'
        });
    },
    
    // (Re)create the steps UI
    updateSteps: function() {
        // Remove the steps view in order to replace it
        var $campusStepsView = this.get$Child('campusSteps');
        var $personalStepsView = this.get$Child('personalSteps');
        
        $campusStepsView.removeAllChildren();
        $personalStepsView.removeAllChildren();
        
        // Display all the steps associated with this contact's campus
        // and all the completed steps, regardless of their campus
        var steps = this.contact.getSteps();
        var stepsLength = steps.length;
        steps.forEach(function(contactStep) {
            var $stepView = this.createStepRow(contactStep);
            var step = AD.Models.Step.cache.getById(contactStep.attr('step_uuid'));
            if (step.attr('campus_uuid')) {
                $campusStepsView.add($stepView);
            }
            else {
                $personalStepsView.add($stepView);
            }
        }, this);
    },
    
    createStepRow: function(contactStep) {
        var _this = this;
        var $newRow = $.View.create(this.createRow());
        
        // Create the step title
        var stepLabel = $newRow.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            right: AD.UI.padding,
            top: 0,
            height: Ti.UI.FILL,
            text: contactStep.getLabel(),
            font: AD.UI.Fonts.mediumSmall
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
            width: AD.Platform.isiOS ? 90 : 120,
            height: AD.UI.buttonHeight,
            title: ''
        });
        dateButton.addEventListener('click', function() {
            // Set the completion date of the step
            _this.createWindow('DatePickerWindow', {
                minDate: new Date(2012, 0, 1), // January 1, 2012
                maxDate: $.today(),
                initialDate: stepCompletedDate
            }).getDeferred().done(function(completedDate) {
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
            stepLabel.right = AD.UI.padding + (dateButton.visible ? (dateButton.right + dateButton.width) : (completedCheckbox.right + completedCheckbox.width));
        };
        updateRow();
        
        return $newRow;
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
    },
    
    // Display a window allowing the user to create personal steps and apply them to the current contact
    addPersonalSteps: function() {
        var contact = this.contact;
        var _this = this;
        this.createWindow('ChooseOptionsWindow', {
            groupName: 'personalStep',
            Model: 'Step',
            filter: { campus_uuid: null },
            initial: contact.getPersonalSteps().map(function(step) { return step.attr('step_uuid'); }),
            editable: true
        }).getDeferred().done(function(options) {
            contact.setPersonalSteps(options);
            _this.updateSteps();
        });
    }
});
