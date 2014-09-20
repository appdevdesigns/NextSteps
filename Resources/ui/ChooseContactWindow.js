var AD = require('AppDev');
var $ = require('jquery');

module.exports = $.Window('AppDev.UI.ChooseContactWindow', {
    actions: [{
        title: 'cancel',
        callback: 'cancel', // special pre-defined callback to reject the deferred
        rightNavButton: true,
        onClose: true
    }]
}, {
    init: function(options) {
        // Build an array of all the record id's of all contacts already in the database
        var usedRecordIds = [];
        AD.Models.Contact.cache.getArray().forEach(function(contact) {
            usedRecordIds.push(contact.contact_recordId);
        });
        
        // Load all the contacts from the user's database
        var contactsData = this.contactsData = [];
        Ti.Contacts.getAllPeople().forEach(function(contact) {
            var contactRecordId = contact.recordId || contact.id;
            if (!options.filterExisting || usedRecordIds.indexOf(contactRecordId) === -1) {
                // This contact is not already in the database
                contactsData.push({
                    title: contact.fullName || '',
                    contact: contact
                });
            }
        });
        
        // Initialize the base $.Window object
        this._super({
            title: 'chooseContactTitle',
            autoOpen: true,
            modal: true
        });
    },
    
    // Create contact table view
    create: function() {
        var _this = this;
        
        // Create the contacts table
        var contactTable = this.add('contactTable', Ti.UI.createTableView({
            data: this.contactsData
        }));
        contactTable.addEventListener('click', function(event) {
            _this.dfd.resolve(event.rowData.contact);
        });
    }
});
