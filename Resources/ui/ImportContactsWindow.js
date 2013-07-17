var $ = require('jquery');
var AD = require('AppDev');

module.exports = $.Window('AppDev.UI.ImportContactsWindow', {
    dependencies: ['ChooseOptionWindow', 'ChooseContactsWindow', 'AddContactWindow'],
    
    years: AD.Models.Year.cache.getArray().map(function(model) { return model.year_label; }),
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
        this.year = 1;
        
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
            textid: 'importHelp'
        }));
        
        // Create the contacts label choose contacts button
        this.add('contactsLabel', Ti.UI.createLabel({
            left: AD.UI.padding,
            top: AD.UI.padding * 2,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE
        }));
        var chooseButton = this.add(Ti.UI.createButton({
            left: AD.UI.padding,
            top: AD.UI.padding / 2,
            width: 120,
            height: AD.UI.buttonHeight,
            titleid: 'unspecified'
        }));
        chooseButton.addEventListener('click', this.proxy('chooseContacts'));
        
        // Campus and year fields
        var fieldsView = this.add(Ti.UI.createView({
            left: AD.UI.padding,
            top: AD.UI.padding,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE,
            layout: 'vertical'
        }));
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
            var chooseButton = Ti.UI.createButton({
                left: labelWidth + AD.UI.padding,
                top: 0,
                width: 120,
                height: AD.UI.buttonHeight
            });
            chooseButton.addEventListener('click', this.proxy('change'+$.capitalize(field)));
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
        importButton.addEventListener('click', this.proxy(function() {
            this.validate().done(this.proxy('import'));
        }));
        
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
        this.getChild('campus').title = AD.Localize('unspecified');
        this.getChild('year').title = AD.Models.Year.cache.getById(this.year).year_label;
        
        this.updateContactsView();
    },
    
    // Update the scrollable view that contains the names of the contacts
    updateContactsView: function() {
        this.getChild('contactsLabel').text = $.formatString('importingContacts', this.contacts.length);
    },
    
    // Handlers for allowing the user to change the contact's year, phone number, and e-mail address
    changeCampus: function() {
        // Allow the user to set the contact's campus
        var campuses = AD.PropertyStore.get('campuses');
        var $winChooseCampus = new AD.UI.ChooseOptionWindow({
            tab: this.tab,
            groupName: 'campus',
            initial: campuses.indexOf(this.campus),
            options: campuses,
            editable: true,
            onOptionsUpdate: function(campusesNew) {
                AD.PropertyStore.set('campuses', campusesNew);
            }
        });
        $winChooseCampus.getDeferred().done(this.proxy(function(campusName) {
            // A campus was chosen
            this.getChild('campus').title = this.campus = campusName.label;
        }));
    },
    changeYear: function() {
        // Allow the user to choose the year of this contact
        var $winChooseYear = new AD.UI.ChooseOptionWindow({
            tab: this.tab,
            groupName: 'year',
            initial: this.year - 1,
            options: AD.UI.AddContactWindow.years
        });
        $winChooseYear.getDeferred().done(this.proxy(function(yearData) {
            // A year was chosen
            this.year = yearData.index + 1;
            this.getChild('year').title = yearData.label;
        }));
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
    
    // Validate the contacts
    validate: function() {
        var warnDfd = $.Deferred();
        var missingFields = [];
        if (!this.campus) {
            missingFields.push('campus');
        }
        if (this.year === 1) {
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
                year_id: this.year,
                contact_campus: this.campus
            });
            contactModel.save();
        }, this);
        this.dfd.resolve();
    }
});
