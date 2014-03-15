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
