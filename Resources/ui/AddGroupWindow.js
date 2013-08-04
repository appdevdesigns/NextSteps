var AD = require('AppDev');
var $ = require('jquery');

module.exports = $.Window('AppDev.UI.AddGroupWindow', {
    setup: function() {
        // When this class is created, create the static fieldDefinitions object
        var fieldDefinitions = this.fieldDefinitions;
        var defineField = function(fieldName, fieldData) {
            // Add a boolean property to quickly check the type of a field
            // For example, fieldData.isChoice === true
            fieldData.fieldName = fieldName;
            fieldData['is'+$.capitalize(fieldData.type)] = true;
            fieldDefinitions[fieldName] = fieldData;
        };
        // Define each of the supported group fields
        defineField('tags', {
            name: 'tags',
            type: 'multichoice',
            Model: 'Tag',
            params: {
                groupName: 'tag',
                editable: true
            }
        });
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

        AD.Models.Step.cache.getArray().forEach(function(step) {
            defineField('steps '+step.getId(), {
                name: step.getLabel(),
                type: 'bool'
            });
        });
    },
    dependencies: ['ChooseOptionWindow', 'Checkbox'],
    
    fieldDefinitions: {},
    
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
        var name = this.add('name', Ti.UI.createTextField({
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
        $fieldsView.getView().addEventListener('click', function() {
            // Hide the name keyboard
            name.blur();
        });
        
        // Create a field row for each group field
        var filter = this.group.attr('group_filter');
        $.each(this.constructor.fieldDefinitions, this.proxy(function(name, definition) {
            var value = findProperty(filter, name);
            var enabled = typeof value !== 'undefined';
            var title = value || AD.Localize('unspecified');
            if (value && definition.isChoice) {
                // "value" refers to the primary key of the model, so lookup the associated model instance
                var model = AD.Models[definition.Model].cache.getById(value);
                if (model) {
                    title = model.getLabel();
                }
                else {
                    // This model instance does not exist anymore
                    enabled = false;
                }
            }
            else if (definition.isMultichoice) {
                title = AD.Localize('unspecified');
            }
            var field = this.fields[name] = {
                enabled: enabled,
                value: enabled && value,
                title: title
            };
            this.createRow(field, definition);
        }));
    },
    
    createRow: function(field, fieldDefinition) {
        // Create the field row container
        var $fieldRow = $.View.create(Ti.UI.createView({
            left: 0,
            top: 0,
            width: AD.UI.screenWidth,
            height: AD.UI.buttonHeight + AD.UI.padding,
        }));
        
        // Create the checkbox to toggle whether this field is included in the group
        var $enabledCheckbox = $fieldRow.add('enabled', new AD.UI.Checkbox({
            createParams: {
                left: AD.UI.padding,
                top: AD.UI.padding / 2
            },
            value: field.enabled
        }));
        $enabledCheckbox.addEventListener('change', function(event) {
            // Enable/disable the row based on the value of the checkbox
            var enabled = field.enabled = event.value;
            $fieldRow.get$Child('value').setEnabled(enabled);
        });
        
        // Create the field name label
        var nameLabel = $fieldRow.add(Ti.UI.createLabel({
            left: AD.UI.Checkbox.defaultSize + AD.UI.padding * 2,
            top: 0,
            height: Ti.UI.FILL,
            text: AD.Localize(fieldDefinition.name),
            font: AD.UI.Fonts.medium
        }));
        
        var _this = this;
        var $valueView = null;
        
        if (fieldDefinition.isBool) {
            // Create the checkbox to toggle the value of this field
            var $valueCheckbox = $valueView = new AD.UI.Checkbox({
                createParams: {
                    right: AD.UI.padding,
                    top: AD.UI.padding / 2
                },
                enabled: field.enabled,
                value: field.value
            });
            $valueCheckbox.addEventListener('change', function(event) {
                // Set the value of this field
                field.value = event.value;
            });
            $enabledCheckbox.addEventListener('change', function(event) {
                var enabled = event.value;
                if (!enabled) {
                    // Uncheck the value checkbox
                    $valueCheckbox.setValue(false);
                }
            });
        }
        else if (fieldDefinition.isChoice || fieldDefinition.isMultichoice) {
            var valueButtonWidth = 120;

            var $conditionCheckbox = null;
            if (fieldDefinition.isMultichoice) {
                var conditions = AD.Models.Contact.filterConditions;
                // Create the condition (any/all) checkbox
                $conditionCheckbox = new AD.UI.Checkbox({
                    createParams: {
                        right: AD.UI.padding * 2 + valueButtonWidth,
                        top: AD.UI.padding / 2
                    },
                    overlayText: AD.Localize('all').toUpperCase(),
                    enabled: field.enabled,
                    value: field.value.condition === conditions[1]
                });
                $conditionCheckbox.addEventListener('change', function(event) {
                    field.value.condition = conditions[event.value ? 1 : 0];
                });
                $fieldRow.add('condition', $conditionCheckbox);
            }

            var valueButton = Ti.UI.createButton({
                right: AD.UI.padding,
                top: AD.UI.padding / 2,
                width: valueButtonWidth,
                height: AD.UI.buttonHeight,
                title: field.enabled ? field.title : ''
            });
            $valueView = $.View.create(valueButton);
            valueButton.addEventListener('click', function() {
                // Assume that all choices are model instances
                var params = $.extend({
                    tab: _this.tab,
                    groupName: fieldDefinition.name,
                    Model: fieldDefinition.Model,
                }, fieldDefinition.params);
                if (fieldDefinition.isChoice) {
                    // This is a single choice field
                    params.initial = field.value;
                    var $winChooseOption = new AD.UI.ChooseOptionWindow(params);
                    $winChooseOption.getDeferred().done(function(option) {
                        // An option was chosen, so set the value of the field in the filter
                        field.value = option.getId();
                        valueButton.title = option.getLabel();
                    });
                }
                else {
                    // This is a multi choice field
                    params.initial = field.value.ids || [];
                    var $winChooseOptions = new AD.UI.ChooseOptionsWindow(params);
                    $winChooseOptions.getDeferred().done(function(options) {
                        // An option was chosen, so set the value of the field in the filter
                        var ids = options.map(function(model) { return model.getId() });
                        field.value.ids = ids;
                    });
                }
            });
            $enabledCheckbox.addEventListener('change', function(event) {
                var enabled = event.value;
                field.value = enabled && fieldDefinition.isMultichoice ? {
                    ids: [],
                    condition: 'OR'
                } : null;
                // Reset the button's text
                valueButton.title = enabled ? AD.Localize('unspecified') : '';

                if ($conditionCheckbox) {
                    $conditionCheckbox.setEnabled(enabled);
                    if (!enabled) {
                        $conditionCheckbox.setValue(false);
                    }
                }
            });
        }
        
        nameLabel.right = $valueView.getView().width + AD.UI.padding * 2;

        $valueView.setEnabled(field.enabled);
        $fieldRow.fieldDefinition = fieldDefinition;
        $fieldRow.add('value', $valueView);

        // The row has the same name as the fieldname of the column in the database
        this.get$Child('fieldsView').add(fieldDefinition.fieldName, $fieldRow);
    },

    // Set the initial contents of the form fields
    initialize: function() {
        this.getChild('name').value = this.group.attr('group_name');
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
            if (fieldDefinition.isChoice && fieldData.enabled && fieldData.value === null) {
                // No option has been chosen
                alert($.formatString('invalidOptionChoice', fieldDefinition.name.toLowerCase()));
                valid = false;
                return false; // stop looping
            }
            if (fieldData.enabled) {
                findProperty(filter, fieldName, fieldData.value);
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

// Find a property on object, optionally setting its value
// This function supports multi-level properties:
//    findProperty({ a: { b: { c: 'd' } } }, 'a b c') === 'd';
//    findProperty({}, 'a b c', 'd') === { a: { b: { c: 'd' } } };
var findProperty = function(object, property, value) {
    var parts = property.split(' ');
    var propertyName = parts.pop();
    var source = object;
    parts.forEach(function(partName) {
        if (!source[partName]) {
            source[partName] = {};
        }
        source = source[partName];
    });
    if (typeof value !== 'undefined') {
        // Set the value of the property
        return source[propertyName] = value;
    }
    else {
        // Get the value of the property
        return source[propertyName];
    }
};
