var AD = require('AppDev');
var $ = require('jquery');

// Create a class that represents the contacts table
var ContactTable = $.ModelTable('AppDev.UI.ContactTable', {
    setup: function() {
        AD.PropertyStore.setDefault('sort_order', this.sortFields.map(function(field) { return field.field; }));
        this.indexedSortFields = $.indexArray(this.sortFields, 'field');
        $.ModelTable.addGroupProcessor('firstLetter', function(key) {
            return key[0] ? key[0].toUpperCase() : '';
        });
        $.ModelTable.addGroupProcessor('year', function(key) {
            return AD.Models.Year.cache.getById(key).year_label;
        });
    },
    
    sortFields: [
        {field: 'contact_campus', label: 'campus'},
        {field: 'contact_firstName', label: 'firstName', groupProcessor: 'firstLetter'},
        {field: 'contact_lastName', label: 'lastName', groupProcessor: 'firstLetter'},
        {field: 'year_id', label: 'year', groupProcessor: 'year'}
    ]
}, {
    init: function(options) {
        var group = this.options.group;
        
        // The group filter must be setup before the ModelTable is initialized 
        this.groupFilter = null;
        if (group) {
            this.groupFilter = group.attr('group_filter');
        }
        
        this._super({
            $window: this.options.$window,
            Model: AD.Models.Contact,
            selectable: true,
            editable: true,
            grouped: true,
            sorted: true,
            sortOrder: AD.PropertyStore.get('sort_order')
        });
        
        if (group) {
            this.smartBind(group, 'group_filter', function() {
                // When the group filter is updated, refresh the table contents
                this.groupFilter = group.attr('group_filter');
                this.refresh();
            });
        }
        
        // When the sort order is updated, refresh the contacts list
        this.smartBind(AD.PropertyStore, 'sort_order', function(event, sortOrder) {
            this.setSortOrder(sortOrder);
        });
    },
    
    // Create and return a table view row that represents the contact
    createRow: function(contact) {
        // Create a table view row that represents this contact
        var row = Ti.UI.createTableViewRow({
            height: 60
        });
        
        var useableRowWidth = AD.UI.useableScreenWidth - 20; // 10 unit padding on each side and space for 'hasChild' arrow
        
        // Create the contact name label
        var nameFont = {fontWeight: 'bold', fontSize: 20};
        var nameLabel = Ti.UI.createLabel({
            left: 10,
            top: 5,
            width: 200,
            height: 24,
            text: '', // will be set by 'update'
            font: nameFont
        });
        row.add(nameLabel);
        // Create the contact year label
        var yearLabel = Ti.UI.createLabel({
            left: 10,
            top: 5,
            width: AD.UI.useableScreenWidth - 10,
            height: 'auto',
            text: '', // will be set by 'update'
            textAlign: 'right',
            font: AD.UI.Fonts.medium
        });
        row.add(yearLabel);
        
        var firstRowHeight = 30;
        // Create the last step taken row which consists of the step name and date
        var lastUpdateStepLabel = Ti.UI.createLabel({
            left: 30,
            top: firstRowHeight,
            width: useableRowWidth * 3 / 5,
            height: 'auto',
            text: '', // will be set by 'update'
            color: 'gray',
            font: AD.UI.Fonts.medium
        });
        row.add(lastUpdateStepLabel);
        var lastUpdateDateLabel = Ti.UI.createLabel({
            left: 30,
            top: firstRowHeight,
            width: useableRowWidth - 20,
            height: 'auto',
            text: '', // will be set by 'update'
            color: 'gray',
            textAlign: 'right',
            font: AD.UI.Fonts.medium
        });
        row.add(lastUpdateDateLabel);
        
        // Update the contact row to reflect changes in the contact's data
        var update = function() {
            nameLabel.text = contact.getLabel();
            yearLabel.text = contact.year_label;
            
            // Use space instead of empty string to work around iPhone quirk where label text is not updated when changed from an empty string
            var lastStepCompleted = contact.getLastStep();
            lastUpdateDateLabel.text = lastStepCompleted ? $.formatDate(lastStepCompleted.completionDate) : ' ';
            lastUpdateStepLabel.text = lastStepCompleted ? L('step_'+lastStepCompleted.stepName) : ' ';
        };
        update();
        
        this.smartBind(contact, 'updated', function(event, updatedContact) {
            // This row's contact was updated
            update();
        });
        
        return row;
    },
    
    // Called when a contact row is selected
    onSelect: function(contact) {
        var $winViewContact = new AD.UI.ViewContactWindow({tab: this.options.$window.tab, contact: contact});
    },
    
    // Filter out all contacts that do not match the group filter
    filter: function(contact) {
        return !this.groupFilter || contact.matchesFilter(this.groupFilter);
    }
});

module.exports = $.Window('AppDev.UI.AppContactsWindow', {
    dependencies: ['AddContactWindow', 'ImportContactsWindow', 'ViewContactWindow', 'SortOrderWindow'],
    
    setup: function() {
        // Add the Android actions for adding contacts method
        this.addContactMethods.forEach(function(method) {
            if ($.isFunction(method.callback)) {
                this.actions.push({
                    title: method.title,
                    callback: method.callback,
                    enabled: function() {
                        // The add menu items are only available if the contacts window is not displaying a group
                        return this.options.group ? false : true;
                    },
                    platform: 'Android'
                });
            }
        }, this);
        this._super.apply(this, arguments);
    },
    
    addContactMethods: [
        {title: 'create', callback: function() {
            var $winAddContactWindow = new AD.UI.AddContactWindow({ tab: this.options.tab, operation: 'create' });
        }},
        {title: 'importTitle', callback: function() {
            var $winAddContactWindow = new AD.UI.AddContactWindow({ tab: this.options.tab, operation: 'import' });
        }},
        {title: 'massImport', callback: function() {
            var $winImportContactsWindow = new AD.UI.ImportContactsWindow({ tab: this.options.tab });
        }},
        {title: 'cancel'}
    ],
    actions: [{
        title: 'add',
        callback: 'addContact',
        platform: 'iOS',
        enabled: function() {
            // The add contact action is only available if the contacts window is not displaying a group
            return this.options.group ? false : true;
        },
        rightNavButton: true
    }, {
        title: 'sort',
        callback: function() {
            // Allow the user to specify the conact sort order
            var $winSortOrder = new AD.UI.SortOrderWindow({
                tab: this.options.tab,
                fields: ContactTable.sortFields,
                order: AD.PropertyStore.get('sort_order')
            });
            $winSortOrder.getDeferred().done(this.proxy(function(order) {
                AD.PropertyStore.set('sort_order', order);
            }));
        },
        leftNavButton: function() {
            // Only show the sort button if a group is not specified
            return !this.options.group;
        }
    }]
}, {
    init: function(options) {
        // Initialize the base $.Window object
        this._super({
            title: 'contactsTitle',
            tab: options.tab
        });
        
        this.smartBind(AD.Models.Contact, '*', this.updateTitle);
        if (this.options.group) {
            this.updateTitle();
            this.open();
            this.smartBind(this.options.group, 'updated.attr', this.updateTitle);
        }
        else {
            // Update the window title after a little while so that the tab
            // bar title will be correct (it should not display 'Contacts - X')
            setTimeout(this.proxy('updateTitle'), 0);
        }
    },
    
    // Create the child views
    create: function() {
        var $contactsTable = new ContactTable({
            group: this.options.group,
            $window: this
        });
        this.add('contactsTable', $contactsTable);
    },
    
    // Update the window title
    updateTitle: function() {
        var contactCount = this.get$Child('contactsTable').countRows();
        if (this.options.group) {
            // Set the window title to match the group name
            this.window.title = this.options.group.attr('group_name') + ' - ' + contactCount;
        }
        else {
            this.window.title = L('contactsTitle') + ' - ' + contactCount;
        }
    },
    
    // Allow the user to choose an add method (add, create, or import), then add a contact using the specified method 
    addContact: function() {
        var methods = this.constructor.addContactMethods;
        var dialog = Ti.UI.createOptionDialog({
            cancel: methods.length - 1,
            options: methods.map(function(method) { return L(method.title); }),
            titleid: 'addMethod'
        });
        var _this = this;
        dialog.addEventListener('click', function(event) {
            var method = methods[event.index];
            if (method && method.callback) {
                method.callback.call(_this);
            }
        });
        dialog.show();
    }
});
