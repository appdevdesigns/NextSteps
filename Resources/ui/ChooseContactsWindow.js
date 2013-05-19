var $ = require('jquery');
var AD = require('AppDev');

module.exports = $.Window('AppDev.UI.ChooseContactsWindow', {
    actions: [{
        title: 'done',
        callback: function() {
            // Resolve the deferred with all the chosen contacts
            var chosenContacts = this.rows.filter(function(contactData) {
                return contactData.hasCheck;
            });
            this.dfd.resolve(chosenContacts);
        },
        rightNavButton: true,
        backButton: true
    }, {
        title: 'cancel',
        callback: 'cancel', // special pre-defined callback to reject the deferred
        leftNavButton: true
    }]
}, {
    init: function(options) {
        // Build a dictionary of all the contacts that are initially chosen
        var contacts = this.options.contacts || [];
        var chosenContacts = $.indexArray(contacts, 'recordId');

        // Build a dictionary of the contacts already in the database
        var usedRecordIds = $.indexArray(AD.Models.Contact.cache.getArray(), 'contact_recordId');

        // Load all the contacts from the user's Address Book, remove contacts that already have a NextSteps
        // contact associated with them, create a table row object for them, and then sort them by last name
        // Convert to table row BEFORE sorting to avoid having to sort
        // Titanium.Contacts.Person instances; rearranging them is apparently relatively slow
        this.rows = Ti.Contacts.getAllPeople().filter(function(contact) {
            return typeof usedRecordIds[contact.recordId || contact.id] === 'undefined';
        }).map(function(contact) {
            return {
                title: contact.fullName,
                // Android does not allow access to the lastName property, so assume that it is the last word of the full name
                sortKey: (contact.lastName || contact.fullName.split(' ').pop() || '').toUpperCase(),
                hasCheck: typeof chosenContacts[contact.recordId || contact.id] !== 'undefined',
                recordId: contact.recordId || contact.id
            };
        }).sort(function(contact1, contact2) {
            return $.compare(contact1.sortKey, contact2.sortKey);
        }).map(function(contact, index) {
            contact.index = index;
            return Ti.UI.createTableViewRow(contact);
        });

        // Initialize the base $.Window object
        this._super({
            title: 'chooseContactsTitle',
            tab: this.options.tab,
            autoOpen: true
        });
    },

    // Create contact table view
    create: function() {
        // Group the contacts by last name
        var sections = AD.UI.rowsToSections(this.rows, function(row) {
            // The section heading is the uppercased first letter of the contact's last name
            return row.sortKey[0] || '';
        });

        // Create the contacts table
        var contactTable = this.add('contactTable', Ti.UI.createTableView({
            data: sections
        }));
        var _this = this;
        contactTable.addEventListener('click', function(event) {
            // Toggle the check mark
            _this.rows[event.row.index].hasCheck = event.row.hasCheck = !event.row.hasCheck;
        });
    }
});
