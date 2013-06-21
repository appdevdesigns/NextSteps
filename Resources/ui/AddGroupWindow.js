var AD = require('AppDev');
var $ = require('jquery');

module.exports = $.Window('AppDev.UI.AddGroupWindow', {
    setup: function() {
        // When this class is created, create the static fieldDefinitions object
        var fieldDefinitions = this.fieldDefinitions;
        var defineField = function(fieldName, fieldData) {
            fieldDefinitions[fieldName] = fieldData;
        };
        // Define each of the supported group fields
        defineField('campus_guid', {
            name: 'campus',
            type: 'choice',
            Model: 'Campus',
            params: {
                editable: true
            }
        });
        defineField('year_id', {
            name: 'year',
            type: 'choice',
            Model: 'Year'
        });
        $.each(AD.Models.Contact.steps, function(stepName, stepFieldName) {
            defineField(stepFieldName, {
                name: 'step_'+stepName,
                type: 'bool'
            });
        });
    },
    dependencies: ['ChooseOptionWindow', 'Checkbox'],
    
    fieldDefinitions: {},
    rowHeight: AD.UI.buttonHeight + AD.UI.padding,
    
    // Quick function to display the add group window in a single function call
    // Add a new group or update an existing group
    addGroup: function(tab, existingGroup) {
        // Open the 'Add Group' window in the current tab
        var AddGroupWindow = this;
        var $winAddGroup = new AddGroupWindow({tab: tab, existingGroup: existingGroup});
        $winAddGroup.getDeferred().done(function(group) {
            // 'group' is an AD.Models.Group model instance
            
            // Create/update the group's record in the database 
            group.save();
        });
    },
    
    actions: [{
        title: 'save',
        callback: function() {
            this.save();
        },
        rightNavButton: true
    }, {
        title: 'del',
        callback: function() {
            AD.UI.yesNoAlert('groupDeleteConfirmation').done(this.proxy(function() {
                // The user chose "Yes", so close the window and delete the group
                this.dfd.reject();
                this.group.destroy();
            }));
        },
        enabled: function() {
            return !this.adding;
        },
        platform: 'Android'
    }, {
        title: 'cancel',
        callback: 'cancel', // special pre-defined callback to reject the deferred
        leftNavButton: true,
        backButton: true
    }]
}, {
    init: function(options) {
        var _this = this;
        
        // If existingGroup is a 'truthy' value, we are editing, otherwise we are adding
        this.adding = this.options.existingGroup ? false : true;
        
        // Create a new local group model if necessary
        this.group = this.adding ? new AD.Models.Group({
            group_name: '',
            group_filter: {}
        }) : this.options.existingGroup;
        
        // This object holds the values of all the group fields
        this.fields = {};
        
        // Initialize the base $.Window object
        this._super({
            title: this.adding ? 'addGroup' : 'editGroup',
            autoOpen: true,
            focusedChild: this.adding ? 'name' : null,
            createParams: {
                layout: 'vertical'
            }
        });
    },
    
    // Create each of the form fields
    create: function() {
        // Create the name field and label
        this.add(Ti.UI.createLabel({
            left: AD.UI.padding,
            top: AD.UI.padding,
            width: Ti.UI.SIZE,
            height: Ti.UI.SIZE,
            textid: 'groupName'
        }));
        this.add('name', Ti.UI.createTextField({
            left: AD.UI.padding,
            top: AD.UI.padding,
            width: AD.UI.useableScreenWidth,
            height: AD.UI.textFieldHeight,
            borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
            value: ''
        }));
        
        // Create the scrollable group fields container
        var $fieldsView = this.add('fieldsView', $.View.create(Ti.UI.createScrollView({
            left: 0,
            top: AD.UI.padding,
            width: AD.UI.screenWidth,
            height: Ti.UI.FILL,
            layout: 'vertical',
            scrollType: 'vertical',
            contentHeight: 'auto',
            showVerticalScrollIndicator: true
        })));
        var _this = this;
        $fieldsView.getView().addEventListener('click', function() {
            // Hide the name keyboard
            _this.getChild('name').blur();
        });
        
        // Create a field row for each group field
        $.each(this.constructor.fieldDefinitions, this.proxy('createRow'));
    },
    
    createRow: function(fieldName, fieldDefinition) {
        var fields = this.fields; // fields is now a reference to this.field
        
        // Create the field row container
        var $fieldRow = $.View.create(Ti.UI.createView({
            left: 0,
            top: 0,
            width: AD.UI.screenWidth,
            height: this.constructor.rowHeight
        }));
        
        // Create the checkbox to toggle whether this field is included in the group
        var $enabledCheckbox = $fieldRow.add('enabled', new AD.UI.Checkbox({
            createParams: {
                left: AD.UI.padding,
                top: AD.UI.padding / 2
            },
            value: false
        }));
        $enabledCheckbox.addEventListener('change', function(event) {
            // Enable/disable the row based on the value of the checkbox
            var enabled = fields[fieldName].enabled = event.value;
            $fieldRow.get$Child('value').setEnabled(enabled);
        });
        
        // Create the field name label
        $fieldRow.add(Ti.UI.createLabel({
            left: AD.UI.Checkbox.defaultSize + AD.UI.padding * 2,
            top: 0,
            width: Ti.UI.SIZE,
            height: Ti.UI.FILL,
            text: AD.Localize(fieldDefinition.name),
            font: AD.UI.Fonts.medium
        }));
        
        var _this = this;
        var $valueView = null;
        
        if (fieldDefinition.type === 'bool') {
            // Create the checkbox to toggle the value of this field
            var $valueCheckbox = $valueView = new AD.UI.Checkbox({
                createParams: {
                    right: AD.UI.padding,
                    top: AD.UI.padding / 2
                },
                value: false
            });
            $valueCheckbox.addEventListener('change', function(event) {
                // Set the value of this field
                fields[fieldName].value = event.value;
            });
            $enabledCheckbox.addEventListener('change', function(event) {
                var enabled = event.value;
                if (!enabled) {
                    // Uncheck the value checkbox
                    $valueCheckbox.setValue(false);
                }
            });
        }
        else if (fieldDefinition.type === 'choice') {
            var $valueButton = $valueView = $.View.create(Ti.UI.createButton({
                right: AD.UI.padding,
                top: AD.UI.padding / 2,
                width: 120,
                height: AD.UI.buttonHeight
            }));
            var valueButton = $valueButton.getView();
            $valueButton.addEventListener('click', function() {
                // Assume that all choices are model instances
                var params = $.extend({
                    tab: _this.tab,
                    groupName: fieldDefinition.name,
                    Model: fieldDefinition.Model,
                    initial: fields[fieldName].value,
                }, fieldDefinition.params);
                var $winChooseOption = new AD.UI.ChooseOptionWindow(params);
                $winChooseOption.getDeferred().done(function(option) {
                    // An option was chosen, so set the value of the field in the filter
                    fields[fieldName].value = option.getId();
                    valueButton.title = option.getLabel();
                });
            });
            $enabledCheckbox.addEventListener('change', function(event) {
                var enabled = event.value;
                fields[fieldName].value = null;
                // Reset the button's text
                valueButton.title = enabled ? AD.Localize('unspecified') : '';
            });
        }
        
        $valueView.setEnabled(false);
        $fieldRow.fieldDefinition = fieldDefinition;
        $fieldRow.add('value', $valueView);
        
        // The row has the same name as the fieldname of the column in the database
        this.get$Child('fieldsView').add(fieldName, $fieldRow);
    },
    
    // Set the initial contents of the form fields
    initialize: function() {
        this.getChild('name').value = this.group.attr('group_name');
        
        // Initialize each of the set rows
        var fieldDefinitions = this.constructor.fieldDefinitions;
        var fields = this.fields; // this object was populated by this.create
        var filter = this.group.attr('group_filter');
        $.each(this.get$Child('fieldsView').children, function(fieldName, fieldRow) {
            var fieldDefinition = fieldDefinitions[fieldName];
            var enabled = typeof filter[fieldName] !== 'undefined';
            var value = filter[fieldName];
            var title = value;
            if (value && fieldDefinition.isChoice) {
                // "value" refers to the primary key of the model, so lookup the associated model instance
                var model = AD.Models[fieldDefinition.Model].cache.getById(value);
                if (model) {
                    title = model.getLabel();
                }
                else {
                    // This model instance does not exist anymore
                    enabled = false;
                }
            }
            var fieldData = fields[fieldName] = {
                enabled: enabled,
                value: enabled && value
            };
            
            var $fieldRow = fieldRow.get$View();
            var $enabledCheckbox = $fieldRow.get$Child('enabled');
            var $valueView = $fieldRow.get$Child('value');
            
            // Modify the enabled and value views to reflect their values in the group
            $valueView.setEnabled(enabled);
            $enabledCheckbox.setValue(fieldData.enabled);
            var fieldType = fieldDefinition.type;
            if (fieldType === 'bool') {
                var $valueCheckbox = $valueView;
                $valueCheckbox.setEnabled(fieldData.enabled);
                $valueCheckbox.setValue(fieldData.enabled && fieldData.value);
            }
            else if (fieldType === 'choice') {
                var $valueButton = $valueView;
                $valueButton.getView().title = fieldData.enabled ? title : '';
            }
        });
    },
    
    // Save the current group
    save: function() {
        if (!this.getChild('name').value) {
            alert(AD.Localize('invalidGroupName'));
            return;
        }
        
        // Build the filter object that will be stringified and inserted into the database
        var valid = true;
        var fieldDefinitions = this.constructor.fieldDefinitions;
        var filter = {};
        $.each(this.fields, function(fieldName, fieldData) {
            var fieldDefinition = fieldDefinitions[fieldName];
            if (fieldDefinition.type === 'choice' && fieldData.enabled && fieldData.value === null) {
                // No option has been chosen
                alert($.formatString('invalidOptionChoice', fieldDefinition.name.toLowerCase()));
                valid = false;
                return false; // stop looping
            }
            if (fieldData.enabled) {
                filter[fieldName] = fieldData.value;
            }
        });
        
        if (valid) {
            // Update the group model
            this.group.attrs({
                group_name: this.getChild('name').value,
                group_filter: filter
            });
            this.dfd.resolve(this.group);
        }
    }
});
