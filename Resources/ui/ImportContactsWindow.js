var $ = require('jquery');
var AD = require('AppDev');

module.exports = $.Window('AppDev.UI.ImportContactsWindow', {
    dependencies: ['ChooseOptionWindow', 'ChooseContactsWindow', 'AddContactWindow'],
    
    fields: [{
        name: 'campus'
    }, {
        name: 'year'
    }, {
        name: 'tags',
        noButton: true
    }],
    actions: [{
        title: 'cancel',
        callback: 'cancel',
        leftNavButton: true,
        backButton: true
    }]
}, {
    init: function(options) {
        this.contacts = [];
        
        this.campus_guid = null;
        this.year_id = 1;
        this.tags = []; // an array of Tag model instances
        
        // Initialize the base $.Window object
        this._super({
            title: 'importContactsTitle',
            autoOpen: true,
            createParams: {
                layout: 'vertical'
            }
        });
    },
    
    // Create each of the form fields
    create: function() {
        // Explanatory text label
        this.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            top: AD.UI.padding,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE,
            textid: 'importHelp',
            font: AD.UI.Fonts.mediumSmall
        }));
        
        // Create the contacts label and choose contacts button
        var $contactsView = this.add($.View.create(Ti.UI.createView({
            top: AD.UI.padding,
            width: AD.UI.screenWidth,
            height: AD.UI.buttonHeight
        })));
        this.record('contactsLabel', $contactsView.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            top: 0,
            width: Ti.UI.SIZE,
            height: Ti.UI.FILL
        })));
        var chooseButton = $contactsView.add(Ti.UI.createButton({
            right: AD.UI.padding,
            top: 0,
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'unspecified'
        }));
        chooseButton.addEventListener('click', this.proxy('chooseContacts'));
        
        var _this = this;

        // Create the fields container
        var fieldsView = this.add(Ti.UI.createView({
            left: AD.UI.padding,
            top: AD.UI.padding,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE,
            layout: 'vertical'
        }));
        // Create the campus, year, and tag fields
        var labelWidth = 80;
        var fieldHeight = AD.UI.buttonHeight;
        this.constructor.fields.forEach(function(field, index) {
            var fieldView = Ti.UI.createView({
                left: 0,
                top: AD.UI.padding,
                width: Ti.UI.SIZE,
                height: fieldHeight
            });
            fieldView.add(Ti.UI.createLabel({
                left: 0,
                width: labelWidth,
                height: Ti.UI.SIZE,
                textid: field.name
            }));

            var changeCallback = function() {
                // Calculate the names of the change and update field functions
                // changeFieldFuncName === 'changeYear' and updateFieldFuncName === 'updateYear', for example
                var changeFieldFuncName = 'change'+$.capitalize(field.name);
                var updateFieldFuncName = 'update'+$.capitalize(field.name);
                _this[changeFieldFuncName]().done(function() {
                    // After the field is changed, update its associated UI
                    _this[updateFieldFuncName]();
                });
            };
            var valueField = null;
            if (field.noButton) {
                // Create a label that can be clicked to change the field value
                valueField = Ti.UI.createLabel({
                    left: labelWidth + AD.UI.padding,
                    right: AD.UI.padding,
                    top: 0,
                    height: Ti.UI.FILL,
                    font: AD.UI.Fonts.mediumSmall
                });
                fieldView.addEventListener('click', changeCallback);
            }
            else {
                // Create a button that can be clicked to change the field value
                var chooseButton = valueField = Ti.UI.createButton({
                    left: labelWidth + AD.UI.padding,
                    top: 0,
                    width: 120,
                    height: AD.UI.buttonHeight
                });
                chooseButton.addEventListener('click', changeCallback);
            }
            fieldView.add(this.record(field.name, valueField));

            fieldsView.add(fieldView);
        }, this);
        
        // Create the import button
        var importButton = this.add('importButton', Ti.UI.createButton({
            top: AD.UI.padding * 2,
            center: { x: AD.UI.screenWidth / 2 }, // horizontally centered
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'importTitle'
        }));
        importButton.addEventListener('click', function() {
            _this.validate().done(function() {
                _this.import();
            });
        });
        
        // Create the import progress bar, which is initially hidden
        this.add('importProgress', Ti.UI.createProgressBar({
            top: -AD.UI.buttonHeight, // display on top of the import button
            center: { x: AD.UI.screenWidth / 2 }, // horizontally centered
            width: AD.UI.screenWidth * 0.75,
            height: 40,
            font: { fontSize: 14, fontWeight: 'bold' },
            message: '',
            visible: false
        }));
    },
    
    // Set the initial contents of the form fields
    initialize: function() {
        // Initialize the fields by calling updateCampus, updateYear, etc.
        this.constructor.fields.forEach(function(field) {
            this['update'+$.capitalize(field.name)]();
        }, this);
        
        this.updateContactsView();
    },
    
    // Choose which contacts to import
    chooseContacts: function() {
        var _this = this;
        this.createWindow('ChooseContactsWindow', {
            contacts: this.contacts
        }).getDeferred().done(function(contacts) {
            _this.contacts = contacts;
            _this.updateContactsView();
        });
    },
    
    // Handlers for setting the campus, year, and tags applied to the imported contacts
    changeCampus: function() {
        var _this = this;
        // Allow the user to choose the contacts' campus
        return this.createWindow('ChooseOptionWindow', {
            groupName: 'campus',
            Model: 'Campus',
            initial: this.campus_guid,
            editable: true
        }).getDeferred().done(function(campus) {
            // A campus was chosen
            _this.campus_guid = campus ? campus.getId() : null;
        });
    },
    changeYear: function() {
        var _this = this;
        // Allow the user to choose the contacts' year
        return this.createWindow('ChooseOptionWindow', {
            groupName: 'year',
            Model: 'Year',
            initial: this.year_id
        }).getDeferred().done(function(year) {
            // A year was chosen
            _this.year_id = year.getId();
        });
    },
    changeTags: function() {
        var _this = this;
        // Allow the user to choose the contacts' associated tags
        return this.createWindow('ChooseOptionsWindow', {
            groupName: 'tag',
            Model: 'Tag',
            initial: $.Model.getIds(this.tags),
            editable: true
        }).getDeferred().done(function(tags) {
            _this.tags = tags;
        });
    },
    
    // Update the scrollable view that contains the names of the contacts
    updateContactsView: function() {
        this.getChild('contactsLabel').text = $.formatString('importingContacts', this.contacts.length);
    },

    // Update the field labels
    updateCampus: function() {
        this.getChild('campus').title = this.campus_guid ? AD.Models.Campus.cache.getById(this.campus_guid).getLabel() : AD.Localize('unspecified');
    },
    updateYear: function() {
        this.getChild('year').title = AD.Models.Year.cache.getById(this.year_id).getLabel();
    },
    updateTags: function() {
        this.getChild('tags').text = $.Model.getLabels(this.tags).join(', ') || AD.Localize('none');
    },
    
    // Validate the contacts
    validate: function() {
        var warnDfd = $.Deferred();
        var missingFields = [];
        if (!this.campus_guid) {
            missingFields.push('campus');
        }
        if (this.year_id === 1) {
            missingFields.push('year');
        }
        if (this.contacts.length === 0) {
            alert(AD.Localize('importNoContacts'));
            warnDfd.reject();
        }
        else if (missingFields.length > 0) {
            var warning = $.formatString('importWarning', missingFields.join(' '+AD.Localize('or')+' '));
            AD.UI.yesNoAlert(warning).then(warnDfd.resolve, warnDfd.reject);
        }
        else {
            warnDfd.resolve();
        }
        return warnDfd.promise();
    },
    
    // Import the contacts
    'import': function() {
        // Hide the import button
        this.getChild('importButton').visible = false;
        
        // Initialize and show the progress bar
        var importProgress = this.getChild('importProgress');
        importProgress.visible = true;
        importProgress.value = 0;
        importProgress.min = 0;
        importProgress.max = this.contacts.length - 1;
        
        // Import each contact
        this.contacts.forEach(function(contact, index) {
            // Update the progress bar
            importProgress.value = index;
            importProgress.message = $.formatString('importStatus', index + 1, this.contacts.length);
            
            var contactModel = AD.UI.AddContactWindow.createContact({
                contact_recordId: contact.recordId,
                campus_guid: this.campus_guid,
                year_id: this.year_id,
            });
            var tags = this.tags;
            contactModel.save().done(function() {
                // Set the tags AFTER saving the contact so that contact_guid will be available
                contactModel.setTags(tags);
            });
        }, this);
        this.dfd.resolve();
    }
});
