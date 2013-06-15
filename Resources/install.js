var AD = require('AppDev');
var ADinstall = require('appdev/install');

module.exports.install = function() {
    return ADinstall.install({
        installDatabases: installDatabases,
        onInstall: onInstall
    });
};

// Called when the app is installed or updated
var onInstall = function() {
    // Set the campus list to an empty array if the property does not exist yet
    AD.PropertyStore.setDefault('campuses', []);
};

// Create the necessary databases for the application
var installDatabases = function(dbVersion) {
    // Create the necessary database tables
    var DataStore = require('appdev/db/DataStoreSQLite');
    var dbName = AD.Defaults.dbName;
    var query = function(query, values) {
        return DataStore.execute(dbName, query, values);
    };
    
    // Between 0 (uninstalled) and 1.1, exclusive
    var pre1_1 = ADinstall.compareVersions(dbVersion, '0') > 0 && ADinstall.compareVersions(dbVersion, '1.1') < 0;
    // Between 0 (uninstalled) and 1.5, exclusive
    var pre1_5 = ADinstall.compareVersions(dbVersion, '0') > 0 && ADinstall.compareVersions(dbVersion, '1.5') < 0;
    if (pre1_1) {
        // Add device_id columns
        query("ALTER TABLE nextsteps_contact ADD COLUMN device_id TEXT DEFAULT ?", [Ti.Platform.id]);
        query("ALTER TABLE nextsteps_group ADD COLUMN device_id TEXT DEFAULT ?", [Ti.Platform.id]);
        
        // Add and populate guid columns
        query("ALTER TABLE nextsteps_contact ADD COLUMN contact_guid TEXT DEFAULT NULL UNIQUE");
        query("UPDATE nextsteps_contact SET contact_guid = contact_id||'.'||device_id");
        query("ALTER TABLE nextsteps_group ADD COLUMN group_guid TEXT DEFAULT NULL UNIQUE");
        query("UPDATE nextsteps_group SET group_guid = group_id||'.'||device_id");
        
        // Contact year_id is now a 1-based index, rather than a 0-based index
        query("UPDATE nextsteps_contact SET year_id = year_id+1");
        
        // Rename the nextsteps_contact table so that it will be recreated
        query("ALTER TABLE nextsteps_contact RENAME TO nextsteps_contact_temp");
    }
    else if (pre1_5) {
        // Rename the nextsteps_contact and nextsteps_group tables so they will be recreated
        query("ALTER TABLE nextsteps_contact RENAME TO nextsteps_contact_temp");
        query("ALTER TABLE nextsteps_group RENAME TO nextsteps_group_temp");
    }
    
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
               contact_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,\
               contact_guid TEXT DEFAULT NULL UNIQUE,\
               viewer_id INTEGER NOT NULL,\
               device_id TEXT NOT NULL,\
               contact_recordId INTEGER,\
               contact_firstName TEXT NOT NULL,\
               contact_lastName TEXT NOT NULL,\
               contact_nickname TEXT,\
               contact_campus TEXT,\
               year_id INTEGER NOT NULL DEFAULT 1,\
               contact_phone TEXT,\
               contact_phoneId TEXT,\
               contact_email TEXT,\
               contact_emailId TEXT,\
               contact_notes TEXT,\
               contact_preEv TEXT DEFAULT NULL,\
               contact_conversation TEXT DEFAULT NULL,\
               contact_Gpresentation TEXT DEFAULT NULL,\
               contact_decision TEXT DEFAULT NULL,\
               contact_finishedFU TEXT DEFAULT NULL,\
               contact_HSpresentation TEXT DEFAULT NULL,\
               contact_engaged TEXT DEFAULT NULL,\
               contact_ministering TEXT DEFAULT NULL,\
               contact_multiplying TEXT DEFAULT NULL\
           )");
    query("CREATE TRIGGER IF NOT EXISTS contact_guid AFTER INSERT ON nextsteps_contact FOR EACH ROW\
           BEGIN\
               UPDATE nextsteps_contact SET contact_guid = NEW.contact_id||'.'||NEW.device_id WHERE contact_id=NEW.contact_id;\
           END");
    query("CREATE TABLE IF NOT EXISTS nextsteps_group (\
               group_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,\
               group_guid TEXT DEFAULT NULL UNIQUE,\
               viewer_id INTEGER NOT NULL,\
               device_id TEXT NOT NULL,\
               group_name TEXT NOT NULL,\
               group_filter TEXT NOT NULL\
           )");
    query("CREATE TRIGGER IF NOT EXISTS group_guid AFTER INSERT ON nextsteps_group FOR EACH ROW\
           BEGIN\
               UPDATE nextsteps_group SET group_guid = NEW.group_id||'.'||NEW.device_id WHERE group_id=NEW.group_id;\
           END");
    
    query("CREATE TABLE IF NOT EXISTS nextsteps_year_data (\
               year_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE\
           )");
    query("CREATE TABLE IF NOT EXISTS nextsteps_year_trans (\
               trans_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,\
               year_id INTEGER NOT NULL DEFAULT 1,\
               language_code TEXT NOT NULL DEFAULT '',\
               year_label TEXT NOT NULL\
           )");
    // Empty the tables and recreate the year labels
    query("DELETE FROM nextsteps_year_data");
    query("DELETE FROM nextsteps_year_trans");
    var yearLabels = ['Unknown', 'Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduated', 'Teacher', 'Other'];
    yearLabels.forEach(function(yearLabel, index) {
        var id = index + 1;
        query("INSERT INTO nextsteps_year_data (year_id) VALUES (?)", [id]);
        query("INSERT INTO nextsteps_year_trans (trans_id, year_id, language_code, year_label) VALUES (?, ?, 'en', ?)", [id, id, yearLabel]);
    });
    
    query("CREATE TABLE IF NOT EXISTS nextsteps_tag (\
               tag_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,\
               tag_guid TEXT DEFAULT NULL UNIQUE,\
               viewer_id INTEGER NOT NULL,\
               device_id TEXT NOT NULL,\
               tag_label TEXT NOT NULL\
           )");
    query("CREATE TRIGGER IF NOT EXISTS tag_guid AFTER INSERT ON nextsteps_tag FOR EACH ROW\
           BEGIN\
               UPDATE nextsteps_tag SET tag_guid = NEW.tag_id||'.'||NEW.device_id WHERE tag_id=NEW.tag_id;\
           END");
    query("CREATE TABLE IF NOT EXISTS nextsteps_contact_tag (\
               contacttag_id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,\
               contacttag_guid TEXT DEFAULT NULL UNIQUE,\
               viewer_id INTEGER NOT NULL,\
               device_id TEXT NOT NULL,\
               contact_guid TEXT NOT NULL REFERENCES nextsteps_contact(contact_guid) ON DELETE CASCADE,\
               tag_guid TEXT NOT NULL REFERENCES nextsteps_tag(tag_guid) ON DELETE CASCADE\
           )");
    query("CREATE TRIGGER IF NOT EXISTS contacttag_guid AFTER INSERT ON nextsteps_contact_tag FOR EACH ROW\
           BEGIN\
               UPDATE nextsteps_contact_tag SET contacttag_guid = NEW.contacttag_id||'.'||NEW.device_id WHERE contacttag_id=NEW.contacttag_id;\
           END");

    if (pre1_1) {
        // After recreating the nextsteps_contact table, copy contact data back in
        var fields = 'contact_id, contact_guid, viewer_id, device_id, contact_recordId, contact_firstName, contact_lastName, contact_nickname, contact_campus, year_id, contact_phone, contact_phoneId, contact_email, contact_emailId, contact_notes, contact_preEv, contact_conversation, contact_Gpresentation, contact_decision, contact_finishedFU, contact_HSpresentation, contact_engaged, contact_ministering, contact_multiplying';
        query("INSERT INTO nextsteps_contact ("+fields+") SELECT "+fields+" FROM nextsteps_contact_temp");
        query("DROP TABLE nextsteps_contact_temp");
        
        // Now contact_recordId of NULL, rather than -1, refers to a contact not in the address book
        query("UPDATE nextsteps_contact SET contact_recordId = NULL WHERE contact_recordId = -1");
    }
    else if (pre1_5) {
        // After recreating the nextsteps_contact and nextsteps_group tables, copy contact and group data back in
        query("INSERT INTO nextsteps_contact SELECT * FROM nextsteps_contact_temp");
        query("DROP TABLE nextsteps_contact_temp");
        query("INSERT INTO nextsteps_group SELECT * FROM nextsteps_group_temp");
        query("DROP TABLE nextsteps_group_temp");
    }
};
