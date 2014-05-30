var AD = require('AppDev');
var $ = require('jquery');

// Create a class that represents the contacts table
var ContactTable = $.ModelTable('AppDev.UI.ContactTable', {
    init: function() {
        AD.PropertyStore.setDefault('sort_order', this.sortFields.map(function(field) { return field.field; }));
        $.ModelTable.addGroupProcessor('firstLetter', function(key) {
            return key ? key[0].toUpperCase() : key;
        });
        $.ModelTable.addGroupProcessor('year', function(key) {
            return AD.Models.Year.cache.getById(key).getLabel();
        });
        return this._super.apply(this, arguments);
    },
    
    sortFields: [
        {field: 'campus_label', label: 'campus'},
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
        
        this.smartBind(AD.Models.ContactStep, '*', this.refresh);
        this.smartBind(AD.Models.ContactTag, '*', this.refresh);

        // When the sort order is updated, refresh the contacts list
        this.smartBind(AD.PropertyStore, 'sort_order', function(event, sortOrder) {
            this.setSortOrder(sortOrder);
        });
    },
    
    // Create and return a table view row that represents the contact
    createRow: function(contact) {
        // Create a table view row that represents this contact
        var row = Ti.UI.createTableViewRow({
            height: 50
        });
        
        // Create the contact name label
        var nameRowHeight = 25;
        var nameFont = {fontWeight: 'bold', fontSize: 20};
        var nameLabel = Ti.UI.createLabel({
            left: AD.UI.padding,
            top: 0,
            width: Ti.UI.SIZE,
            height: nameRowHeight,
            text: '', // will be set by 'update'
            font: nameFont
        });
        row.add(nameLabel);
        // Create the contact year label
        var yearLabel = Ti.UI.createLabel({
            right: AD.UI.padding,
            top: 0,
            width: Ti.UI.SIZE,
            height: nameRowHeight,
            text: '', // will be set by 'update'
            textAlign: 'right',
            font: AD.UI.Fonts.medium
        });
        row.add(yearLabel);
        
        // Create the last step taken row which consists of the step name and date
        var dateWidth = 80;
        var lastUpdateStepLabel = Ti.UI.createLabel({
            left: AD.UI.padding,
            right: AD.UI.padding * 2 + dateWidth,
            top: nameRowHeight,
            width: Ti.UI.FILL,
            height: Ti.UI.SIZE,
            text: '', // will be set by 'update'
            wordWrap: false,
            ellipsize: true,
            color: 'gray',
            font: AD.UI.Fonts.mediumSmall
        });
        row.add(lastUpdateStepLabel);
        var lastUpdateDateLabel = Ti.UI.createLabel({
            right: AD.UI.padding,
            top: nameRowHeight,
            width: dateWidth,
            height: Ti.UI.SIZE,
            text: '', // will be set by 'update'
            color: 'gray',
            textAlign: 'right',
            font: AD.UI.Fonts.mediumSmall
        });
        row.add(lastUpdateDateLabel);
        
        // Update the contact row to reflect changes in the contact's data
        var update = function() {
            nameLabel.text = contact.getLabel();
            yearLabel.text = contact.attr('year_label');
            
            // Use space instead of empty string to work around iPhone quirk where label text is not updated when changed from an empty string
            var lastStepCompleted = contact.getLastStep();
            lastUpdateDateLabel.text = lastStepCompleted ? $.formatDate(lastStepCompleted.attr('step_date')) : ' ';
            lastUpdateStepLabel.text = lastStepCompleted ? lastStepCompleted.getLabel() : ' ';
        };
        update();
        
        this.smartBind(AD.Models.ContactStep, '*', $.throttle(update));
        this.smartBind(contact, 'updated', update);
        
        return row;
    },
    
    // Called when a contact row is selected
    onSelect: function(contact) {
        var $winViewContact = this.$window.createWindow('ViewContactWindow', { contact: contact });
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
                this.actions.push($.extend({
                    enabled: function() {
                        // The add menu items are only available if the contacts window is not displaying a group
                        return this.options.group ? false : true;
                    },
                    platform: 'Android'
                }, method));
            }
        }, this);
        this._super.apply(this, arguments);
    },
    
    addContactMethods: [{
        title: 'create',
        callback: function() {
            var $winAddContactWindow = this.createWindow('AddContactWindow', { operation: 'create' });
        },
        showAsAction: true,
        icon: '/images/ic_action_new.png'
    }, {
        title: 'importTitle',
        callback: function() {
            var $winAddContactWindow = this.createWindow('AddContactWindow', { operation: 'import' });
        },
        showAsAction: true,
        icon: '/images/arrow-up.png'
    }, {
        title: 'massImport', callback: function() {
            var $winImportContactsWindow = this.createWindow('ImportContactsWindow');
        }
    }, {
        title: 'cancel'
    }],
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
            // Allow the user to specify the contact sort order
            var $winSortOrder = this.createWindow('SortOrderWindow', {
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
            title: 'contactsTitle'
        });
        
        if (this.options.group) {
            this.updateTitle();
            this.open();
            this.smartBind(this.options.group, 'group_name', this.updateTitle);
            this.smartBind(this.options.group, 'destroyed', function() {
                // If the group is destroyed, close the window
                this.dfd.reject();
            });
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
        // Update the window title whenever the contact table is updated
        $contactsTable.update = this.proxy('updateTitle');
        
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
            this.window.title = AD.Localize('contactsTitle') + ' - ' + contactCount;
        }
    },
    
    // Allow the user to choose an add method (add, create, or import), then add a contact using the specified method 
    addContact: function() {
        var methods = this.constructor.addContactMethods;
        var dialog = Ti.UI.createOptionDialog({
            cancel: methods.length - 1,
            options: methods.map(function(method) { return AD.Localize(method.title); }),
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
