var AD = require('AppDev');
var $ = require('jquery');

module.exports = $.Window('AppDev.UI.AddContactWindow', {
    setup: function() {
        // When this class is created, initialize the static fields object
        this.fields.forEach(function(field) {
            // The database field name defaults to contact_ prepended to the field's name
            field.field = field.field || 'contact_'+field.name;
            
            field.callback = field.callback || 'change'+$.capitalize(field.name);
            field.labelId = field.label || field.name+'Label';
        });
    },
    dependencies: ['ChooseOptionWindow'],
    
    // Return the first value in the multivalue dictionary with a name in priorities 
    getDefaultFromMultivalue: function(multivalue, priorities) {
        var highestPriority = { value: null, id: null };
        priorities.forEach(function(fieldName) {
            var values = multivalue[fieldName];
            if (values && values.length > 0) {
                // Use the first value
                highestPriority = {
                    value: values[0],
                    id: fieldName+':0' 
                };
            }
        });
        return highestPriority;
    },
    
    // Return a new contact model instance
    createContact: function(attrs) {
        var localContact = Ti.Contacts.getPersonByID(attrs.contact_recordId);
        var firstName = '', lastName = '', nickname = '', defaultPhone = {value: null, id: null}, defaultEmail = {value: null, id: null}, note = '';
        if (localContact) {
            firstName = localContact.firstName || '';
            lastName = localContact.lastName || '';
            nickname = localContact.nickname || '';
            if (AD.Platform.Android) {
                // Android does not allow access to the firstName, lastName, or nickname properties, so attempt to guess them
                var nameParts = localContact.fullName.split(' ');
                firstName = firstName || nameParts[0];
                lastName = lastName || nameParts[nameParts.length - 1];
                nickname = nickname || firstName;
            }
            defaultPhone = this.getDefaultFromMultivalue(localContact.getPhone(), ['iPhone', 'mobile']);
            defaultEmail = this.getDefaultFromMultivalue(localContact.getEmail(), ['home', 'work']);
            note = localContact.note || '';
        }
        var defaultYear = 0;
        
        // Populate the contact model fields with the new contact's information
        var baseAttrs = {
            viewer_id: AD.Viewer.viewer_id,
            contact_firstName: firstName,
            contact_lastName: lastName,
            contact_nickname: nickname,
            contact_campus: '',
            year_id: defaultYear,
            contact_phone: defaultPhone.value,
            contact_phoneId: defaultPhone.id,
            contact_email: defaultEmail.value,
            contact_emailId: defaultEmail.id,
            contact_notes: note
        };
        $.each(AD.Models.Contact.steps, function(stepName, stepFieldName) {
            baseAttrs[stepFieldName] = null;
        });
        var mergedAttrs = $.extend(baseAttrs, attrs);
        mergedAttrs.year_label = AD.Models.Year.cache.getById(mergedAttrs.year_id).year_label;
        return new AD.Models.Contact(mergedAttrs);
    },
    
    fields: [
        {name: 'firstName', type: 'text'},
        {name: 'lastName', type: 'text'},
        {name: 'campus', type: 'choice'},
        {name: 'year', type: 'choice', field: 'year_label'},
        {name: 'phone', type: 'choice/text', keyboard: Ti.UI.KEYBOARD_PHONE_PAD, autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE},
        {name: 'email', type: 'choice/text', keyboard: Ti.UI.KEYBOARD_EMAIL, autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE},
        {name: 'notes', type: 'text', multiline: true}
    ],
    
    years: AD.Models.Year.cache.getArray().map(function(model) { return model.year_label; }),
    actions: [{
        title: 'save',
        callback: function() {
            this.save();
        },
        rightNavButton: true
    }, {
        title: 'close',
        callback: function() {
            if (this.operation === 'edit') {
                // Changes to contacts are automatically saved during editing
                this.save();
            }
            else {
                // Closing the window cancels the add or create operation
                this.dfd.reject();
            }
        },
        onClose: true,
        backButton: true
    }]
}, {
    init: function(options) {
        var _this = this;
        
        this.operation = options.operation;
        var getContactDfd = $.Deferred();
        
        // This handler must be attached before the handler that calls this.initialize in $.Window
        getContactDfd.done(this.proxy(function(contactData) {
            this.inAddressBook = contactData.localContact ? true : false;
            
            // Build the fields array which is the same as the static fields array, with types expanded    
            this.fields = this.constructor.fields.map(function(field) {
                // Expand the type property
                var types = field.type.split('/');
                var type = types[(this.inAddressBook || types.length === 1) ? 0 : 1];
                // Clone the field to prevent aliasing
                return $.extend({}, field, {type: type});
            }, this);
            
            this.contact = contactData.contact;
            this.localContact = contactData.localContact;
            this.window.title = L(this.operation+'Contact');
            this.open();
        }));
        
        // Initialize the base $.Window object
        // Pass in deferreds to delay the execution of this.create and this.initialize until a contact is chosen
        this._super({
            tab: options.tab,
            createDfd: getContactDfd.promise(),
            initializeDfd: getContactDfd.promise()
        });
        
        if (this.operation === 'import') {
            // Load an existing contact from the user's address book
            var chooseContactDfd = $.Deferred();
            Titanium.Contacts.showContacts({
                canceled: chooseContactDfd.reject,
                selectedPerson: function(event) {
                    chooseContactDfd.resolve(event.person);
                }
            });
            chooseContactDfd.done(this.proxy(function(selectedContact) {
                var contactRecordId = selectedContact.recordId || selectedContact.id; // recordId on iOS and id on Android
                var existingContacts = AD.Models.Contact.cache.query({contact_recordId: contactRecordId});
                var contact = null;
                if (existingContacts.length > 0) {
                    if (existingContacts.length > 1) {
                        console.warn('Found multiple contacts with the same recordId!');
                    }
                    // A contact was chosen that already exists, so edit the contact
                    contact = existingContacts[0];
                    this.operation = 'edit';
                }
                else {
                    contact = this.constructor.createContact({contact_recordId: contactRecordId});
                }
                getContactDfd.resolve({
                    contact: contact,
                    localContact: selectedContact
                });
            })).fail(this.dfd.reject); // Cancel the add contact operation
        }
        else if (this.operation === 'edit') {
            // Load the existing contact from the address book
            var localContact = Ti.Contacts.getPersonByID(options.existingContact.contact_recordId);
            getContactDfd.resolve({
                contact: options.existingContact,
                localContact: localContact
            });
        }
        else if (this.operation === 'create') {
            // Create a contact model not tied to an address book entry
            var contact = this.constructor.createContact({contact_recordId: -1});
            getContactDfd.resolve({
                contact: contact,
                localContact: null
            });
        }
    },
    
    // Create each of the form fields
    create: function() {
        var labelWidth = 80;
        
        // Create the form fields
        if (AD.Platform.isiPhone) {
            // On iPhone, attempt to mimic the built-in Contacts app
            
            var focusedTextField = null;
            
            // Create each of the fields as rows in the table
            var rows = [];
            this.fields.forEach(function(field, index) {
                var fieldRow = Ti.UI.createTableViewRow({
                    height: 40,
                    index: index
                });
                // Create the field name label
                fieldRow.add(Ti.UI.createLabel({
                    left: 0,
                    width: labelWidth,
                    height: Ti.UI.SIZE,
                    text: L(field.name).toLowerCase(),
                    textAlign: 'right',
                    color: AD.UI.systemBlueColor,
                    font: {fontSize: 15, fontWeight: 'bold'} // medium-small bold
                }));
                var fieldValue = this.contact.attr(field.field);
                var fieldView = null;
                if (field.type === 'choice') {
                    // Create the value label
                    fieldView = Ti.UI.createLabel({
                        left: labelWidth + 10,
                        width: Ti.UI.FILL,
                        height: Ti.UI.FILL,
                        text: fieldValue
                    });
                }
                else if (field.type === 'text') {
                    if (field.multiline === true) {
                        fieldView = Ti.UI.createTextArea({
                            left: labelWidth + 10,
                            right: 10,
                            height: Ti.UI.FILL,
                            font: AD.UI.Fonts.medium,
                            keyboardType: field.keyboard,
                            suppressReturn: false
                        });
                        // Make the row taller to accommodate the text area
                        fieldRow.height = 120;
                    }
                    else {
                        fieldView = Ti.UI.createTextField({
                            left: labelWidth + 10,
                            width: Ti.UI.FILL,
                            height: Ti.UI.FILL,
                            keyboardType: field.keyboard,
                            autocapitalization: field.autocapitalization
                        });
                    }
                    fieldView.value = fieldValue;
                }
                
                fieldView.addEventListener('focus', function() {
                    // Keep track of which text field (or text area) is currently selected
                    focusedTextField = fieldView;
                });
                
                // Add the field to the row
                fieldRow.add(this.record(field.labelId, fieldView));
                rows.push(fieldRow);
            }, this);
            
            // Create the fields table that holds the year, phone number, and email address fields
            var table = this.add(Ti.UI.createTableView({
                data: rows,
                style: Ti.UI.iPhone.TableViewStyle.GROUPED
            }));
            
            var activeRow = null;
            table.addEventListener('click', this.proxy(function(event) {
                if (focusedTextField) {
                    // Unfocus the previously selected text field to hide the keyboard
                    focusedTextField.blur();
                }
                
                var field = this.fields[event.row.index];
                if (field.type === 'choice') {
                    // When a choice row is clicked, call the callback that will presumably allow the user to choose a value
                    // The callback can be a function or the name of function property on the window
                    var callback = $.isFunction(field.callback) ? field.callback : this[field.callback];
                    callback.call(this);
                }
                
                activeRow = event.row;
            }));
        }
        else {
            this.add($headerView);
            
            fields.forEach(function(field, index) {
                var labelId = field.toLowerCase() + 'Label';
                var callback = this['change'+field];
                
                var top = 50 + index * 40;
                var chooseButton = this.add(Ti.UI.createButton({
                    left: 10,
                    top: top,
                    width: 80,
                    height: AD.UI.buttonHeight,
                    titleid: field.toLowerCase()
                }));
                chooseButton.addEventListener('click', this.proxy(callback));
                this.record(labelId, Ti.UI.createLabel({
                    left: 100,
                    top: top,
                    height: Ti.UI.SIZE,
                    text: ''
                }));
            }, this);
            
            this.add($footerView);
        }
    },
    
    // Set the initial contents of the form fields
    initialize: function() {
        var localContact = this.localContact;
        this.phoneNumbers = localContact && AD.UI.ChooseOptionWindow.multivalueToOptionsArray(localContact.getPhone());
        this.emailAddresses = localContact && AD.UI.ChooseOptionWindow.multivalueToOptionsArray(localContact.getEmail());
    },
    
    // Handlers for allowing the user to change the contact's campus, year, phone number, and e-mail address
    changeCampus: function() {
        // Allow the user to set the contact's campus
        var campuses = AD.PropertyStore.get('campuses');
        var $winChooseCampus = new AD.UI.ChooseOptionWindow({
            tab: this.tab,
            groupName: 'campus',
            initial: campuses.indexOf(this.contact.contact_campus),
            options: campuses,
            editable: true,
            onOptionsUpdate: function(campusesNew) {
                campuses = campusesNew;
                AD.PropertyStore.set('campuses', campusesNew);
            }
        });
        $winChooseCampus.getDeferred().done(this.proxy(function(campusName) {
            // A campus was chosen
            this.contact.attr('contact_campus', campusName.label);
            this.getChild('campusLabel').text = campusName.label;
        }));
    },
    changeYear: function() {
        // Allow the user to choose the year of this contact
        var $winChooseYear = new AD.UI.ChooseOptionWindow({
            tab: this.tab,
            groupName: 'year',
            initial: this.contact.year_id,
            options: this.constructor.years
        });
        $winChooseYear.getDeferred().done(this.proxy(function(yearData) {
            // A year was chosen
            this.contact.attr('year_id', yearData.index);
            this.contact.attr('year_label', yearData.label);
            this.getChild('yearLabel').text = yearData.label;
        }));
    },
    changePhone: function() {
        // Allow the user to choose the phone number to associate with this contact
        var $winChoosePhone = new AD.UI.ChooseOptionWindow({
            tab: this.tab,
            groupName: 'phone',
            initial: this.contact.contact_phoneId,
            options: this.phoneNumbers
        });
        $winChoosePhone.getDeferred().done(this.proxy(function(phoneNumber) {
            // A phone number was chosen
            this.contact.attr('contact_phone', phoneNumber.value);
            this.contact.attr('contact_phoneId', phoneNumber.id);
            this.getChild('phoneLabel').text = phoneNumber.value;
        }));
    },
    changeEmail: function() {
        // Allow the user to choose the email address to associate with this contact
        var $winChooseEmail = new AD.UI.ChooseOptionWindow({
            tab: this.tab,
            groupName: 'email',
            initial: this.contact.contact_emailId,
            options: this.emailAddresses
        });
        $winChooseEmail.getDeferred().done(this.proxy(function(emailAddress) {
            // An email address was chosen
            this.contact.attr('contact_email', emailAddress.value);
            this.contact.attr('contact_emailId', emailAddress.id);
            this.getChild('emailLabel').text = emailAddress.value;
        }));
    },
    
    // Update the contact model and close the window
    save: function() {
        // Read the values of the text fields
        this.fields.forEach(function(field) {
            if (field.type === 'text') {
                this.contact.attr(field.field, this.children[field.labelId].value);
            }
        }, this);
        this.dfd.resolve(this.contact);
        if (this.options.autoSave !== false) {
            // Create/update the contact's record in the database unless
            // explicitly prevented by the autoSave option being set to false
            this.contact.save();
        }
    }
});
