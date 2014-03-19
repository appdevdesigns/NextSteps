var AD = require('AppDev');
var $ = require('jquery');
var ADinstall = require('appdev/install');

module.exports.install = function() {
    return ADinstall.install({
        installDatabases: installDatabases,
        onInstall: onInstall
    });
};

// Return the field name prefix given the database table name
var getPrefix = function(tableName) {
    if (/_trans$/.test(tableName)) {
        return 'trans';
    }
    var matches = /^nextsteps_(\w+?)(?:_data)?$/.exec(tableName);
    return matches ? matches[1].replace(/_/g, '') : '';
};

module.exports.upgraders = [{
    version: '1.1',
    upgrade: function(database) {
        var tables = database.tables;
            var updateYearId = function(row) {
                row.year_id += 1;
            };
            tables.nextsteps_contact.forEach(function(contact) {
                // Add the device_id and contact_guid fields
                contact.device_id = Ti.Platform.id;
                contact.contact_guid = contact.contact_id + '.' + contact.device_id;
                
                // Contact year_id is now a 1-based index, rather than a 0-based index
                updateYearId(contact);
                
                // Now a contact_recordId of null, rather than -1, refers to a contact not in the address book
                if (contact.contact_recordId === -1) {
                    contact.contact_recordId = null;
                }
            });
            tables.nextsteps_year_data.forEach(updateYearId);
            tables.nextsteps_year_trans.forEach(updateYearId);
            
            tables.nextsteps_group.forEach(function(group) {
                // Add the device_id and contact_guid fields
                group.device_id = Ti.Platform.id;
                group.group_guid = group.group_id + '.' + group.device_id;
            });
        
        return database;
    }
}, {
    version: '1.5',
    upgrade: function(database) {
        var tables = database.tables;
        [
            'nextsteps_contact', 'nextsteps_group', 'nextsteps_campus_data', 'nextsteps_campus_trans',
            'nextsteps_tag_data', 'nextsteps_tag_trans', 'nextsteps_contact_tag',
            'nextsteps_step_data', 'nextsteps_step_trans', 'nextsteps_contact_step'
        ].forEach(function(tableName) {
            var table = tables[tableName];
            if (!table) {
                // Create the table if necessary
                table = tables[tableName] = [];
            }
            
            // Calculate the table's id and guid field names based on its name
            var prefix = table.prefix = getPrefix(tableName);
            table.id_field   = prefix + '_id';   // the name of the guid field (e.g. 'contact_id')
            table.guid_field = prefix + '_guid'; // the name of the guid field (e.g. 'contact_guid')
        });
        var setGuid = function(table, row) {
            var device_id = row.device_id = Ti.Platform.id;
            row.viewer_id = AD.Defaults.viewerId;
            row[table.guid_field] = row[table.id_field] + '.' + device_id;
        };
        var insertRow = function(table, row) {
            row[table.id_field] = table.length + 1;
            setGuid(table, row);
            table.push(row);
            return row;
        };
        
        var indexedYears = $.indexArray(tables.nextsteps_year_trans, 'year_label');
        
        // Create the step labels
        var stepLabels = [{
            "en": "Pre-ev",
            "zh-Hans": "福音预工"
        }, {
            "en": "G Conversation",
            "zh-Hans": "福音会话"
        }, {
            "en": "G Presentation",
            "zh-Hans": "福音传讲"
        }, {
            "en": "Decision",
            "zh-Hans": "做决定"
        }, {
            "en": "Finished Following Up",
            "zh-Hans": "跟进结束"
        }, {
            "en": "HS Presentation",
            "zh-Hans": "传讲圣灵"
        }, {
            "en": "Trained for Action",
            "zh-Hans": "培训传讲福音"
        }, {
            "en": "Challenged as Lifetime Laborer",
            "zh-Hans": "挑战成为一生服事主的工人"
        }, {
            "en": "Challenged to Develop Local Resources",
            "zh-Hans": "挑战培养当地教会资源"
        }, {
            "en": "Engaged Disciple",
            "zh-Hans": "参加门徒训练"
        }, {
            "en": "Multiplying Disciple",
            "zh-Hans": "门徒倍增"
        }, {
            "en": "Movement Leader",
            "zh-Hans": "运动领袖"
        }, {
            "en": "New Lifetime Laborer",
            "zh-Hans": "成为一生服事主的工人"
        }, {
            "en": "People Giving Resource",
            "zh-Hans": "服事他人的人"
        }, {
            "en": "Domestic Project",
            "zh-Hans": "国内宣教"
        }, {
            "en": "Cross-Cultural Project",
            "zh-Hans": "跨文化宣教"
        }, {
            "en": "International Project",
            "zh-Hans": "国际宣教"
        }];
        stepLabels.forEach(function(stepLabel) {
            var step = {};
            var step_guid = insertRow(tables.nextsteps_step_data, step).step_guid;
            $.each(stepLabel, function(languageCode, label) {
                insertRow(tables.nextsteps_step_trans, {
                    step_guid: step_guid,
                    language_code: languageCode,
                    step_label: label
                });
            });
        });
        
        // Determine how the old fields in nextsteps_contact map to the new nextsteps_step entries
        var indexedSteps = $.indexArray(tables.nextsteps_step_trans, 'step_label');
        var stepFields = [{
            field: 'contact_preEv',
            label: 'Pre-ev'
        }, {
            field: 'contact_conversation',
            label: 'G Conversation'
        }, {
            field: 'contact_Gpresentation',
            label: 'G Presentation'
        }, {
            field: 'contact_decision',
            label: 'Decision'
        }, {
            field: 'contact_finishedFU',
            label: 'Finished Following Up'
        }, {
            field: 'contact_HSpresentation',
            label: 'HS Presentation'
        }, {
            field: 'contact_engaged',
            label: 'Engaged Disciple'
        }, {
            field: 'contact_multiplying',
            label: 'Multiplying Disciple'
        }];
        stepFields.forEach(function(stepField) {
            // Determine the step_guid of all the steps that must be migrated
            stepField.step_guid = indexedSteps[stepField.label].step_guid;
        });
        var indexedStepFields = $.indexArray(stepFields, 'field');
        
        // A dictionary of campuses indexed by campus_label
        var campusGuidsByLabel = {};
        
        tables.nextsteps_contact.forEach(function(contact) {
            // Reference contact campuses by the guid, rather than by the label
            var campusLabel = contact.contact_campus;
            var campus_guid = campusGuidsByLabel[campusLabel];
            if (campusLabel && !campus_guid) {
                // The campus referenced by the contact does not exist so create it
                campus = insertRow(tables.nextsteps_campus_data, {});
                campus_guid = campus.campus_guid;
                campusGuidsByLabel[campusLabel] = campus_guid;
                AD.Defaults.supportedLanguages.forEach(function(languageCode) {
                    insertRow(tables.nextsteps_campus_trans, {
                        campus_guid: campus_guid,
                        language_code: languageCode,
                        campus_label: languageCode === AD.Defaults.languageKey ? campusLabel : ('['+languageCode+']' + campusLabel)
                    });
                });
            }
            contact.campus_guid = campus_guid;
            
            // Recreate the steps associated with each contact
            stepFields.forEach(function(stepField) {
                var contactStep = {
                    contact_guid: contact.contact_guid,
                    step_guid: stepField.step_guid,
                    step_date: contact[stepField.field]
                };
                insertRow(tables.nextsteps_contact_step, contactStep);
            });
        });
        
        // Update the group filters because of database normalization introduced in version 1.5
        tables.nextsteps_group.forEach(function(group) {
            var filter = JSON.parse(group.group_filter);
            if (filter.contact_campus) {
                // Make the filter reference campuses by guid, rather than by label
                var campus_guid = campusGuidsByLabel[filter.contact_campus];
                if (campus_guid) {
                    filter.campus_guid = campus_guid;
                }
                delete filter.contact_campus;
            }
            
            if (filter.year_label) {
                // Make the filter reference years by id, rather than by label
                filter.year_id = indexedYears[filter.year_label].year_id;
                delete filter.year_label;
            }
            
            // All steps are now contained in a new "steps" filter field
            // and are referenced by guid, rather than by field name
            var steps = filter.steps = {};
            $.each(filter, function(key, value) {
                if (indexedStepFields[key]) {
                    steps[indexedStepFields[key].step_guid] = value;
                    delete filter[key];
                }
            });
            // This step field was removed completely
            delete filter.contact_ministering;
            
            // Save the changes to the group filter
            group.group_filter = JSON.stringify(filter);
        });
        
        return database;
    }
}, {
    version: '2.0',
    upgrade: function(database) {
        // Generate meta-data for each of the database tables
        var tables = {};
        var tablesByGuid = {};
        $.each(database.tables, function(tableName, table) {
            var prefix = getPrefix(tableName);
            var table = tables[tableName] = {
                name: tableName,
                data: table,
                guid: prefix + '_guid', // the name of the guid field (e.g. 'contact_guid')
                uuid: prefix + '_uuid'  // the name of the uuid field (e.g. 'contact_uuid')
            };
            table.dataByGuid = $.indexArray(table.data, table.guid);
            tables[tableName] = table;
            if (table.guid) {
                tablesByGuid[table.guid] = table;
            }
        });
        
        // Call callback for each data row in each table in the database dump
        var iterateData = function(callback) {
            $.each(tables, function(tableName, table) {
                table.data.forEach(function(row) {
                    callback(table, row);
                });
            });
        };
        // Convert the GUID reference to a UUID reference
        var updateGuidReference = function(referencedTable, row) {
            var guidValue = row[referencedTable.guid];
            var uuidFieldName = referencedTable.uuid;
            var referencedRow = referencedTable.dataByGuid[guidValue];
            row[uuidFieldName] = referencedRow ? referencedRow[uuidFieldName] : null;
        };
        
        // Generate a UUID for each row in each table
        iterateData(function(table, row) {
            row[table.uuid] = AD.Model.generateUuid();
        });
        // Convert foreign key references from GUIDs to UUIDs
        iterateData(function(table, row) {
            $.each(row, function(fieldName, fieldValue) {
                // Determine which foreign table this field references, if any
                var referencedTable = tablesByGuid[fieldName];
                if (referencedTable && referencedTable !== table) {
                    // This field is a GUID foreign key reference
                    updateGuidReference(referencedTable, row);
                }
            });
        });
        // Convert GUID references to UUID references in group filters
        tables.nextsteps_group.data.forEach(function(group) {
            var filter = JSON.parse(group.group_filter);
            if (filter.campus_guid) {
                // Reference campuses by UUID
                updateGuidReference(tables.nextsteps_campus_data, filter);
                delete filter.campus_guid;
            }
            
            if (filter.steps) {
                var newSteps = {};
                $.each(filter.steps, function(step_guid, value) {
                    // Reference steps by UUID
                    var step_uuid = tables.nextsteps_step_data.dataByGuid[step_guid].step_uuid;
                    newSteps[step_uuid] = value;
                });
                filter.steps = newSteps;
            }
            
            // Save the changes to the group filter
            group.group_filter = JSON.stringify(filter);
        });
        
        // Add a campus_uuid reference to all steps
        tables.nextsteps_step_data.data.forEach(function(step) {
            step.campus_uuid = null;
        });
        
        return database;
    }
}];

// Called when the app is installed or updated
var onInstall = function(installData) {
    var sortOrder = AD.PropertyStore.get('sort_order');
    if (sortOrder && ADinstall.compareVersions(installData.previousVersion, '1.5') < 0) {
        // The "contact_campus" sort order field was renamed to "campus_label" in version 1.5
        AD.PropertyStore.set('sort_order', sortOrder.map(function(field) {
            return field === 'contact_campus' ? 'campus_label' : field;
        }));
    }
};

// Called during the initial installation after the database has been created
var installDatabases = function(installData) {
    // Install the year labels
    installData.installLabels('nextsteps_year');
};
