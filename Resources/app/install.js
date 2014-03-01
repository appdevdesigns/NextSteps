var AD = require('AppDev');
var $ = require('jquery');
var ADinstall = require('appdev/install');

module.exports.install = function() {
    return ADinstall.install({
        installDatabases: installDatabases,
        onInstall: onInstall
    });
};

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

// Create the necessary databases for the application
var installDatabases = function(installData) {
    // Create the necessary database tables
    var query = installData.query;

    // This keeps track of whether "install" has been called yet
    var installed = false;
    var install = function() {
        query("CREATE TABLE IF NOT EXISTS site_viewer (\
                   viewer_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,\
                   language_key TEXT DEFAULT 'en',\
                   viewer_passWord TEXT,\
                   viewer_userID TEXT,\
                   viewer_isActive INTEGER DEFAULT 0,\
                   viewer_lastLogin TEXT DEFAULT NULL,\
                   viewer_globalUserID TEXT\
               )");
        
        query("CREATE TABLE IF NOT EXISTS nextsteps_contact (\
                   contact_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL,\
                   contact_recordId INTEGER,\
                   contact_firstName TEXT NOT NULL,\
                   contact_lastName TEXT NOT NULL,\
                   contact_nickname TEXT,\
                   campus_uuid TEXT DEFAULT NULL REFERENCES nextsteps_campus_data(campus_uuid) ON DELETE SET DEFAULT,\
                   year_id INTEGER NOT NULL DEFAULT 1,\
                   contact_phone TEXT,\
                   contact_phoneId TEXT,\
                   contact_email TEXT,\
                   contact_emailId TEXT,\
                   contact_notes TEXT\
               )");
        
        query("CREATE TABLE IF NOT EXISTS nextsteps_group (\
                   group_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL,\
                   group_name TEXT NOT NULL,\
                   group_filter TEXT NOT NULL\
               )");
        
        query("CREATE TABLE IF NOT EXISTS nextsteps_campus_data (\
                   campus_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL\
               )");
        query("CREATE TABLE IF NOT EXISTS nextsteps_campus_trans (\
                   trans_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL,\
                   campus_uuid TEXT NOT NULL REFERENCES nextsteps_campus_data(campus_uuid) ON DELETE CASCADE,\
                   language_code TEXT NOT NULL DEFAULT '',\
                   campus_label TEXT NOT NULL\
               )");
        
        query("DROP TABLE IF EXISTS nextsteps_year_data");
        query("DROP TABLE IF EXISTS nextsteps_year_trans");
        query("CREATE TABLE IF NOT EXISTS nextsteps_year_data (\
                   year_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE\
               )");
        query("CREATE TABLE IF NOT EXISTS nextsteps_year_trans (\
                   trans_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,\
                   year_id INTEGER NOT NULL DEFAULT 1,\
                   language_code TEXT NOT NULL DEFAULT '',\
                   year_label TEXT NOT NULL\
               )");
        // Install the year labels
        installData.installLabels('nextsteps_year');
        
        query("CREATE TABLE IF NOT EXISTS nextsteps_tag_data (\
                   tag_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL\
               )");
        query("CREATE TABLE IF NOT EXISTS nextsteps_tag_trans (\
                   trans_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL,\
                   tag_uuid TEXT NOT NULL REFERENCES nextsteps_tag_data(tag_uuid) ON DELETE CASCADE,\
                   language_code TEXT NOT NULL DEFAULT '',\
                   tag_label TEXT NOT NULL\
               )");
        query("CREATE TABLE IF NOT EXISTS nextsteps_contact_tag (\
                   contacttag_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL,\
                   contact_uuid TEXT NOT NULL REFERENCES nextsteps_contact(contact_uuid) ON DELETE CASCADE,\
                   tag_uuid TEXT NOT NULL REFERENCES nextsteps_tag_data(tag_uuid) ON DELETE CASCADE\
               )");
        
        query("CREATE TABLE IF NOT EXISTS nextsteps_step_data (\
                   step_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL,\
                   campus_uuid TEXT DEFAULT NULL REFERENCES nextsteps_campus_data(campus_uuid) DEFAULT NULL\
               )");
        query("CREATE TABLE IF NOT EXISTS nextsteps_step_trans (\
                   trans_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL,\
                   step_uuid TEXT NOT NULL REFERENCES nextsteps_step_data(step_uuid) ON DELETE CASCADE,\
                   language_code TEXT NOT NULL DEFAULT '',\
                   step_label TEXT NOT NULL\
               )");
        query("CREATE TABLE IF NOT EXISTS nextsteps_contact_step (\
                   contactstep_uuid TEXT PRIMARY KEY UNIQUE,\
                   user_id INTEGER NOT NULL,\
                   contact_uuid TEXT NOT NULL REFERENCES nextsteps_contact(contact_uuid) ON DELETE CASCADE,\
                   step_uuid TEXT NOT NULL REFERENCES nextsteps_step_data(step_uuid) ON DELETE CASCADE,\
                   step_date TEXT DEFAULT NULL\
               )");
        
        installed = true;
    };
    
    
    // Installed, but pre-1.1
    if (ADinstall.compareVersions(installData.previousVersion, '0') > 0 && ADinstall.compareVersions(installData.previousVersion, '1.1') < 0) {
        // Upgrade pre-1.1 databases
        
        // Rename the nextsteps_contact and nextsteps_group tables so they will be recreated
        query("ALTER TABLE nextsteps_contact RENAME TO nextsteps_contact_temp");
        query("ALTER TABLE nextsteps_group RENAME TO nextsteps_group_temp");
        
        install();
        
        // Add back a field that was removed to allow the upgrade to version 1.1 to proceed
        // It will be removed again during the upgrade to version 1.5
        query("ALTER TABLE nextsteps_contact ADD COLUMN contact_campus TEXT");
        
        // After recreating the contact and group tables, copy the data back in
        var contactFields = 'contact_id, viewer_id, contact_recordId, contact_firstName, contact_lastName, contact_nickname, contact_campus, year_id, contact_phone, contact_phoneId, contact_email, contact_emailId, contact_notes, contact_preEv, contact_conversation, contact_Gpresentation, contact_decision, contact_finishedFU, contact_HSpresentation, contact_engaged, contact_ministering, contact_multiplying';
        query("INSERT INTO nextsteps_contact ("+contactFields+", contact_guid, device_id) SELECT "+contactFields+", contact_id, ? FROM nextsteps_contact_temp", [Ti.Platform.id]);
        var groupFields = 'group_id, viewer_id, group_name, group_filter';
        query("INSERT INTO nextsteps_group ("+groupFields+", group_guid, device_id) SELECT "+groupFields+", group_id, ? FROM nextsteps_group_temp", [Ti.Platform.id]);
        
        // Populate guid values
        query("UPDATE nextsteps_contact SET contact_guid = contact_id||'.'||device_id");
        query("UPDATE nextsteps_group SET group_guid = group_id||'.'||device_id");
        
        // Contact year_id is now a 1-based index, rather than a 0-based index
        query("UPDATE nextsteps_contact SET year_id = year_id+1");
        
        // Now contact_recordId of NULL, rather than -1, refers to a contact not in the address book
        query("UPDATE nextsteps_contact SET contact_recordId = NULL WHERE contact_recordId = -1");
        
        query("DROP TABLE nextsteps_contact_temp");
        query("DROP TABLE nextsteps_group_temp");
    }
    // Installed, but pre-1.5
    if (ADinstall.compareVersions(installData.previousVersion, '0') > 0 && ADinstall.compareVersions(installData.previousVersion, '1.5') < 0) {
        // Upgrade pre-1.5 databases
        
        // Rename the nextsteps_contact and nextsteps_group tables so they will be recreated
        query("ALTER TABLE nextsteps_contact RENAME TO nextsteps_contact_temp");
        query("DROP TRIGGER IF EXISTS contact_guid");
        query("ALTER TABLE nextsteps_group RENAME TO nextsteps_group_temp");
        query("DROP TRIGGER IF EXISTS group_guid");
        
        install();
        
        // After recreating the nextsteps_contact and nextsteps_group tables, copy contact and group data back in
        var fields = 'contact_id, contact_guid, viewer_id, device_id, contact_recordId, contact_firstName, contact_lastName, contact_nickname, year_id, contact_phone, contact_phoneId, contact_email, contact_emailId, contact_notes';
        query("INSERT INTO nextsteps_contact ("+fields+") SELECT "+fields+" FROM nextsteps_contact_temp");
        query("INSERT INTO nextsteps_group SELECT * FROM nextsteps_group_temp");

        // Load the campus labels from the property store
        var campuses = AD.PropertyStore.get('campuses').map(function(campusLabel) {
            // Create a new campus
            var campus = new AD.Models.Campus({
                campus_label: campusLabel
            });
            campus.save().done(function() {
                var campus_guid = campus.getGuid();
                query("SELECT contact_id FROM nextsteps_contact_temp WHERE contact_campus=?", [campusLabel]).done(function(contactArgs) {
                    // Now update all the contacts that referenced this campus
                    var contact_ids = contactArgs[0].map(function(row) { return row.contact_id; });
                    query("UPDATE nextsteps_contact SET campus_guid=? WHERE contact_id IN ("+contact_ids.join(',')+")", [campus_guid]);
                });
            });
            return campus;
        });
        AD.PropertyStore.remove('campuses');

        // Load all of the year definitions
        var years = [];
        query("SELECT year_label FROM nextsteps_year_trans WHERE language_code = 'en'").done(function(yearArgs) {
            years = yearArgs[0];
        });

        // Migrate the contact steps into the nextsteps_step and nextsteps_contact_step tables
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
            query("SELECT step_guid FROM nextsteps_step_trans WHERE step_label=?", [stepField.label]).done(function(stepArgs) {
                stepField.step_guid = stepArgs[0][0].step_guid;
            });
        });
        query("SELECT contact_guid,"+stepFields.map(function(stepField) { return stepField.field; }).join(',')+" FROM nextsteps_contact_temp").done(function(contactArgs) {
            var contacts = contactArgs[0];
            contacts.forEach(function(contact) {
                // Recreate the steps associated with each contact
                stepFields.forEach(function(stepField) {
                    var contactStep = new AD.Models.ContactStep({
                        contact_guid: contact.contact_guid,
                        step_guid: stepField.step_guid,
                        step_date: contact[stepField.field]
                    });
                    contactStep.save();
                });
            });
        });

        // Update the group filters because of database normalization introduced in version 1.5
        query("SELECT group_guid,group_filter FROM nextsteps_group").done(function(groupArgs) {
            var indexedCampuses = $.indexArray(campuses, 'campus_label');
            var indexedStepFields = $.indexArray(stepFields, 'field');
            var indexedYears = $.indexArray(years, 'year_label');
            var groups = groupArgs[0];
            groups.forEach(function(group) {
                var filter = JSON.parse(group.group_filter);
                if (filter.contact_campus) {
                    // Make the filter reference campuses by guid, rather than by label
                    filter.campus_guid = indexedCampuses[filter.contact_campus].campus_guid;
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

                query("UPDATE nextsteps_group SET group_filter = ? WHERE group_guid = ?", [JSON.stringify(filter), group.group_guid]);
            });
        });

        query("DROP TABLE nextsteps_contact_temp");
        query("DROP TABLE nextsteps_group_temp");
    }
    if (!installed) {
        // Run "install" if it has not been run yet
        install();
    }
};
