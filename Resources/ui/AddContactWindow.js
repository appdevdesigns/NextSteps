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
    
    // Return an array of all the values in a multivalue dictionary
    flattenMultivalue: function(multivalue) {
        var values = [];
        $.each(multivalue, function(key, value) {
            // "value" is an array of values
            values = values.concat(value);
        });
        return values;
    },
    
    // Return a new contact model instance
    createContact: function(attrs) {
        var localContact = attrs.contact_recordId === null ? null : Ti.Contacts.getPersonByID(attrs.contact_recordId);
        var fullName = '', firstName = '', lastName = '', nickname = '', defaultPhone = null, defaultEmail = null, note = '';
        if (localContact) {
            fullName = localContact.fullName || '';
            firstName = localContact.firstName || '';
            lastName = localContact.lastName || '';
            nickname = localContact.nickname || '';
            if (AD.Platform.isAndroid) {
                // Android does not allow access to the firstName, lastName, or nickname properties, so attempt to guess them
                var nameParts = fullName.split(' ');
                firstName = firstName || nameParts[0];
                lastName = lastName || (nameParts.length === 1 ? '' : nameParts[nameParts.length - 1]);
                nickname = nickname || firstName;
            }
            if (!firstName && !lastName) {
                // The contact has no first name or last name, so use its organization (if present) as the last name
                lastName = localContact.organization || '';
            }
            
            // Use the first phone number and email address as the default
            defaultPhone = this.flattenMultivalue(localContact.phone)[0];
            defaultEmail = this.flattenMultivalue(localContact.email)[0];
            
            note = localContact.note || '';
        }
        var defaultYear = 1;
        
        // Populate the contact model fields with the new contact's information
        var baseAttrs = {
            contact_firstName: firstName,
            contact_lastName: lastName,
            contact_nickname: nickname,
            campus_uuid: null,
            year_id: defaultYear,
            contact_phone: defaultPhone,
            contact_email: defaultEmail,
            contact_notes: note
        };
        var mergedAttrs = $.extend(baseAttrs, attrs);
        return new AD.Models.Contact(mergedAttrs);
    },
    
    fields: [
        {name: 'firstName', type: 'text'},
        {name: 'lastName', type: 'text'},
        {name: 'campus', type: 'choice', field: 'campus_label'},
        {name: 'year', type: 'choice', field: 'year_label'},
        {name: 'phone', type: 'choice/text', keyboardType: Ti.UI.KEYBOARD_PHONE_PAD, autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE},
        {name: 'email', type: 'choice/text', keyboardType: Ti.UI.KEYBOARD_EMAIL, autocapitalization: Ti.UI.TEXT_AUTOCAPITALIZATION_NONE},
        {name: 'notes', type: 'text', multiline: true}
    ],
    
    actions: [{
        title: 'save',
        callback: 'save',
        rightNavButton: true,
        onClose: true,
        showAsAction: true,
        icon: '/images/ic_action_save.png'
    }, {
        title: 'cancel',
        callback: 'cancel', // special pre-defined callback to reject the deferred
        leftNavButton: true
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
                
                // Proxy the choice callback
                var callback = null;
                if (type === 'choice') {
                    callback = this.proxy(field.callback);
                }
                
                // Clone the field to prevent aliasing
                return $.extend({}, field, {type: type, callback: callback});
            }, this);
            
            this.contact = contactData.contact;
            this.attrs = this.contact.attrs(); // the changed contact attrs
            this.localContact = contactData.localContact;
            this.window.title = AD.Localize(this.operation+'Contact');
            this.open();
        }));
        
        // Initialize the base $.Window object
        // Pass in deferreds to delay the execution of this.create and this.initialize until a contact is chosen
        this._super({
            createDfd: getContactDfd.promise(),
            initializeDfd: getContactDfd.promise(),
            createParams: {
                layout: 'vertical'
            }
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
            var recordId = options.existingContact.contact_recordId;
            var localContact = recordId === null ? null : Ti.Contacts.getPersonByID(recordId);
            getContactDfd.resolve({
                contact: options.existingContact,
                localContact: localContact
            });
        }
        else if (this.operation === 'create') {
            // Create a contact model not tied to an address book entry
            var contact = this.constructor.createContact({contact_recordId: null});
            getContactDfd.resolve({
                contact: contact,
                localContact: null
            });
        }
    },
    
    // Create each of the form fields
    create: function() {
        var labelWidth = 80;
        var rowHeight = 40;
        
        var focusedTextField = null;
        var hideKeyboard = function() {
            if (focusedTextField) {
                // Unfocus the previously selected text field to hide the keyboard
                focusedTextField.blur();
                focusedTextField = null;
            }
        };

        // Scrollable container that will hold the field rows on non-iPhone platforms
        var table = Ti.UI.createScrollView({
            left: 0,
            top: 0,
            width: AD.UI.screenWidth,
            height: Ti.UI.FILL,
            layout: 'vertical',
            scrollType: 'vertical',
            contentHeight: 'auto',
            showVerticalScrollIndicator: true
        });
        
        // Create the form fields
        // On iPhone, attempt to mimic the built-in Contacts app

        // Create each of the field views
        var rows = [];
        this.fields.forEach(function(field, index) {
            // Create the field row container, a table view row on iPhone and a generic view on other platforms
            var fieldRow = AD.Platform.isiPhone ? Ti.UI.createTableViewRow({}) : Ti.UI.createView({
                left: AD.UI.padding,
                right: 0,
                top: 0
            });
            fieldRow.height = rowHeight;
            fieldRow.index = index;
            
            // Create the field name label
            var label = Ti.UI.createLabel({
                left: 0,
                width: labelWidth,
                height: Ti.UI.SIZE,
                text: AD.Localize(field.name)
            });
            fieldRow.add(label);
            if (AD.Platform.isiPhone) {
                label.applyProperties({
                    text: label.text.toLowerCase(),
                    textAlign: 'right',
                    color: AD.UI.systemBlueColor,
                    font: {fontSize: 15, fontWeight: 'bold'} // medium-small bold
                });
            }
            
            var fieldValue = this.attrs[field.field];
            var fieldView = null;
            if (field.type === 'choice') {
                // Create the value label
                if (AD.Platform.isiPhone) {
                    fieldView = Ti.UI.createLabel({
                        left: labelWidth + AD.UI.padding,
                        width: Ti.UI.FILL,
                        height: Ti.UI.FILL,
                        text: fieldValue
                    });
                }
                else {
                    fieldView = Ti.UI.createButton({
                        left: labelWidth + AD.UI.padding,
                        right: AD.UI.padding,
                        center: { y: rowHeight / 2 },
                        height: AD.UI.buttonHeight,
                        title: fieldValue || AD.Localize('unspecified')
                    });
                    // When a choice row is clicked, call the callback that will presumably allow the user to choose a value
                    fieldView.addEventListener('click', field.callback);
                }
            }
            else if (field.type === 'text') {
                if (field.multiline === true) {
                    fieldView = Ti.UI.createTextArea({
                        left: labelWidth + AD.UI.padding,
                        right: AD.UI.padding,
                        height: Ti.UI.FILL,
                        font: AD.UI.Fonts.small,
                        suppressReturn: false
                    });
                    // Make the row taller to accommodate the text area
                    fieldRow.height *= 3;
                }
                else {
                    fieldView = Ti.UI.createTextField({
                        left: labelWidth + AD.UI.padding,
                        right: AD.UI.padding,
                        center: { y: rowHeight / 2 },
                        height: AD.UI.textFieldHeight
                    });
                }
                
                fieldView.value = fieldValue;
                
                if (field.keyboardType) {
                    fieldView.keyboardType = field.keyboardType;
                }
                if (field.autocapitalization) {
                    fieldView.autocapitalization = field.autocapitalization;
                }
            }
            
            fieldView.addEventListener('focus', function() {
                // Keep track of which text field (or text area) is currently selected
                focusedTextField = fieldView;
            });
            
            // Add the field to the row
            fieldRow.add(this.record(field.labelId, fieldView));
            rows.push(fieldRow);
            
            if (!AD.Platform.isiPhone) {
                table.add(fieldRow);
            }
        }, this);
        
        // On iPhone, hideKeyboard does not work when called from the window click
        // handler, so workaround by calling hideKeybaord from the table click handler
        if (AD.Platform.isiPhone) {
            // Create the fields table that holds the year, phone number, and email address fields
            var iPhoneTable = this.add(Ti.UI.createTableView({
                data: rows,
                style: Ti.UI.iPhone.TableViewStyle.GROUPED
            }));
            iPhoneTable.addEventListener('click', this.proxy(function(event) {
                hideKeyboard();
                
                var field = this.fields[event.row.index];
                if (field.type === 'choice') {
                    // When a choice row is clicked, call the callback that will presumably allow the user to choose a value
                    field.callback();
                }
            }));
        }
        else {
            this.add(table);
            
            // Click anywhere on the window to hide the keyboard
            this.window.addEventListener('click', function(event) {
                hideKeyboard();
            });
        }
    },
    
    // Set the initial contents of the form fields
    initialize: function() {
        var localContact = this.localContact;
        this.phoneNumbers = localContact && this.constructor.flattenMultivalue(localContact.phone);
        this.emailAddresses = localContact && this.constructor.flattenMultivalue(localContact.email);
    },
    
    // Handlers for allowing the user to change the contact's campus, year, phone number, and e-mail address
    changeCampus: function() {
        // Allow the user to set the contact's campus
        this.createWindow('ChooseOptionWindow', {
            groupName: 'campus',
            Model: 'Campus',
            initial: this.attrs.campus_uuid,
            editable: true
        }).getDeferred().done(this.proxy(function(campus) {
            // A campus was chosen
            var label = campus ? campus.getLabel() : null;
            this.attrs.campus_uuid = campus ? campus.getId() : null;
            var campusLabel = this.getChild('campusLabel');
            campusLabel.text = campusLabel.title = label;
        }));
    },
    changeYear: function() {
        // Allow the user to choose the year of this contact
        this.createWindow('ChooseOptionWindow', {
            groupName: 'year',
            Model: 'Year',
            initial: this.attrs.year_id
        }).getDeferred().done(this.proxy(function(year) {
            // A year was chosen
            var label = year.getLabel();
            this.attrs.year_id = year.getId();
            var yearLabel = this.getChild('yearLabel');
            yearLabel.text = yearLabel.title = label;
        }));
    },
    changePhone: function() {
        // Allow the user to choose the phone number to associate with this contact
        this.createWindow('ChooseOptionWindow', {
            groupName: 'phone',
            initial: this.attrs.contact_phone,
            options: this.phoneNumbers
        }).getDeferred().done(this.proxy(function(phoneNumber) {
            // A phone number was chosen
            this.attrs.contact_phone = phoneNumber.value;
            var phoneLabel = this.getChild('phoneLabel');
            phoneLabel.text = phoneLabel.title = phoneNumber.value;
        }));
    },
    changeEmail: function() {
        // Allow the user to choose the email address to associate with this contact
        this.createWindow('ChooseOptionWindow', {
            groupName: 'email',
            initial: this.attrs.contact_email,
            options: this.emailAddresses
        }).getDeferred().done(this.proxy(function(emailAddress) {
            // An email address was chosen
            this.attrs.contact_email = emailAddress.value;
            var emailLabel = this.getChild('emailLabel');
            emailLabel.text = emailLabel.title = emailAddress.value;
        }));
    },
    
    // Update the contact model and close the window
    save: function() {
        // Read the values of the text fields
        this.fields.forEach(function(field) {
            if (field.type === 'text') {
                this.attrs[field.field] = this.children[field.labelId].value;
            }
        }, this);
        
        // Regular expression testing on email
        // It passes all valid emails and rejects some common mistakes
        var contact_email = this.attrs.contact_email;
        if (contact_email && (!/[^@]+@[^@]+\.[^@]+/.test(contact_email))) {
            alert('Email is not valid: ' + contact_email);
        }
        
        if (!this.attrs.contact_firstName && !this.attrs.contact_lastName) {
            alert(AD.Localize('contactInvalidName'));
            return false;
        }
        
        // Apply the changes to the contact
        var oldCampus_uuid = this.contact.attr('campus_uuid');
        this.contact.attrs(this.attrs);
        
        if (this.options.autoSave !== false) {
            // Create/update the contact's record in the database unless
            // explicitly prevented by the autoSave option being set to false
            this.contact.save();
        }
        
        this.dfd.resolve(this.contact);
    }
});
