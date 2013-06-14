var $ = require('jquery');
var AD = require('AppDev');

module.exports = $.Window('AppDev.UI.ImportContactsWindow', {
    dependencies: ['ChooseOptionWindow', 'ChooseContactsWindow', 'AddContactWindow'],
    
    fields: ['campus', 'year'],
    actions: [{
        title: 'cancel',
        callback: 'cancel',
        leftNavButton: true,
        backButton: true
    }]
}, {
    init: function(options) {
        this.contacts = [];
        
        this.campus = '';
        this.year_id = 1;
        
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
        // Create the campus and year fields
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
                textid: field
            }));

            var changeCallback = function() {
                // Calculate the names of the change and update field functions
                // changeFieldFuncName === 'changeYear' and updateFieldFuncName === 'updateYear', for example
                var changeFieldFuncName = 'change'+$.capitalize(field);
                var updateFieldFuncName = 'update'+$.capitalize(field);
                _this[changeFieldFuncName]().done(function() {
                    // After the field is changed, update its associated UI
                    _this[updateFieldFuncName]();
                });
            };
            var chooseButton = Ti.UI.createButton({
                left: labelWidth + AD.UI.padding,
                top: 0,
                width: 120,
                height: AD.UI.buttonHeight
            });
            chooseButton.addEventListener('click', changeCallback);
            fieldView.add(this.record(field, chooseButton));
            
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
        var $winChooseContacts = new AD.UI.ChooseContactsWindow({ tab: this.options.tab, contacts: this.contacts });
        $winChooseContacts.getDeferred().done(function(contacts) {
            _this.contacts = contacts;
            _this.updateContactsView();
        });
    },
    
    // Handlers for setting the campus and year applied to the imported contacts
    changeCampus: function() {
        var _this = this;
        // Allow the user to choose the contacts' campus
        var campuses = AD.PropertyStore.get('campuses');
        var $winChooseCampus = new AD.UI.ChooseOptionWindow({
            tab: this.tab,
            groupName: 'campus',
            initial: this.campus,
            options: campuses,
            editable: true,
            onOptionsUpdate: function(campusesNew) {
                AD.PropertyStore.set('campuses', campusesNew);
            }
        });
        return $winChooseCampus.getDeferred().done(function(campus) {
            // A campus was chosen
            _this.campus = campus.value;
        });
    },
    changeYear: function() {
        var _this = this;
        // Allow the user to choose the contacts' year
        var $winChooseYear = new AD.UI.ChooseOptionWindow({
            tab: this.tab,
            groupName: 'year',
            Model: 'Year',
            initial: this.year_id
        });
        return $winChooseYear.getDeferred().done(function(year) {
            // A year was chosen
            _this.year_id = year.getId();
        });
    },
    
    // Update the scrollable view that contains the names of the contacts
    updateContactsView: function() {
        this.getChild('contactsLabel').text = $.formatString('importingContacts', this.contacts.length);
    },

    // Update the field labels
    updateCampus: function() {
        this.getChild('campus').title = this.campus || AD.Localize('unspecified');
    },
    updateYear: function() {
        this.getChild('year').title = AD.Models.Year.cache.getById(this.year_id).year_label;
    },
    
    // Validate the contacts
    validate: function() {
        var warnDfd = $.Deferred();
        var missingFields = [];
        if (!this.campus) {
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
                contact_campus: this.campus,
                year_id: this.year_id,
            });
            contactModel.save();
        }, this);
        this.dfd.resolve();
    }
});
