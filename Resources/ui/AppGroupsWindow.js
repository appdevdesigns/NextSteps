var AD = require('AppDev');
var $ = require('jquery');

// Create a class that represents the groups table
var GroupTable = $.ModelTable('AppDev.UI.GroupTable', {
    dependencies: ['AppContactsWindow', 'AddGroupWindow']
}, {
    init: function(options) {
        this._super({
            $window: this.options.$window,
            Model: AD.Models.Group,
            selectable: true,
            editable: true
        });
    },
    
    // Create and return a table view row that represents the group
    createRow: function(group) {
        // Create a table view row that represents this group
        var row = Ti.UI.createTableViewRow({
            title: group.attr('group_name')
        });
        this.smartBind(group, 'group_name', function(event) {
            // The group_name has been updated, so update the row title as well
            row.title = group.attr('group_name');
        });
        return row;
    },
    
    // Called when a group row is selected
    onSelect: function(group) {
        // View the filtered contact list specified by the selected group
        var $window = this.$window;
        $window.createWindow('AppContactsWindow', {
            group: group,
            actions: [{
                title: 'edit',
                callback: function() {
                    $window.createWindow('AddGroupWindow', { existingGroup: group });
                },
                rightNavButton: true,
                showAsAction: true,
                icon: '/images/ic_action_edit.png'
            }, {
                title: 'del',
                callback: function() {
                    var _this = this;
                    AD.UI.yesNoAlert('groupDeleteConfirmation').done(function() {
                        // The user chose "Yes", so close the window and delete the group
                        _this.dfd.reject();
                        group.destroy();
                    });
                },
                platform: 'Android',
                showAsAction: true,
                icon: '/images/ic_action_discard.png'
            }]
        });
    }
});

module.exports = $.Window('AppDev.UI.AppGroupsWindow', {
    dependencies: ['AddGroupWindow'],
    actions: [{
        title: 'add',
        callback: function() {
            // Create a new group
            this.createWindow('AddGroupWindow');
        },
        rightNavButton: true,
        showAsAction: true,
        icon: '/images/ic_action_new.png'
    }]
}, {
    init: function(options) {
        // Initialize the base $.Window object
        this._super({
            title: 'groupsTitle'
        });
        
        this.smartBind(AD.Models.Group, 'created', function(event, group) {
            // Simulate a selection to open the newly-created group
            var $groupsTable = this.get$Child('groupsTable');
            $groupsTable.onSelect(group);
        });
    },
    
    // Create the child views
    create: function() {
        var $groupsTable = new GroupTable({
            $window: this
        });
        this.add('groupsTable', $groupsTable);
    }
});
