var $ = require('jquery');
var AD = require('AppDev');

require('ui/ChooseOptionWindow');
module.exports = AD.UI.ChooseOptionsWindow('AppDev.UI.ChooseContactsWindow', {}, {
    init: function(options) {
        // Initialize the base AD.UI.ChooseOptionsWindow object
        this._super({
            groupName: 'contact',
            initial: [],
            options: []
        });
        
        var _this = this;
        AD.UI.requestContactsAuthorization().done(function() {
            // Build a dictionary of all the contacts that are initially chosen
            var contacts = _this.options.contacts || [];
            var chosenContacts = $.indexArray(contacts, 'recordId');
            
            // Build a dictionary of the contacts already in the database
            var usedRecordIds = $.indexArray(AD.Models.Contact.cache.getArray(), 'contact_recordId');
            
            // Load all the contacts from the user's Address Book, remove contacts that already
            // have a NextSteps contact associated with them, then sort them by last name
            var options = Ti.Contacts.getAllPeople().filter(function(contact) {
                return typeof usedRecordIds[contact.recordId || contact.id] === 'undefined';
            }).map(function(contact) {
                return {
                    title: contact.fullName,
                    // Android does not allow access to the lastName property, so assume that it is the last word of the full name
                    sortKey: (contact.lastName || (contact.fullName && contact.fullName.split(' ').pop()) || '').toUpperCase(),
                    selected: typeof chosenContacts[contact.recordId || contact.id] !== 'undefined',
                    recordId: contact.recordId || contact.id
                };
            }).sort(function(contact1, contact2) {
                return $.compare(contact1.sortKey, contact2.sortKey);
            });
            
            // Determine which options should be selected initially
            var selected = [];
            options.forEach(function(option, index) {
                if (option.selected) {
                    selected.push(index);
                }
            });
            
            // Initialize the ChooseOptionsWindow with the contacts data
            _this.options.initial = selected;
            _this.options.options = options;
            _this.initialize();
        });
    }
});
