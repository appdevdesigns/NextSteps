/**
 * AppRAD creation URLs:
 * 
 * http://localhost:8088/appRAD/module/create?name=nextSteps
 * http://localhost:8088/appRAD/model/create?module=nextSteps&ModelName=Contact&tableName=nextsteps_contact&primaryKey=contact_id&labelKey=contact_firstName
 * http://localhost:8088/appRAD/model/create?module=nextSteps&ModelName=Group&tableName=nextsteps_group&primaryKey=group_id&labelKey=group_name
 * http://localhost:8088/appRAD/modelmultilingual/create?module=nextSteps&ModelName=Year&tableNameData=nextsteps_year_data&tableNameTrans=nextsteps_year_trans&primaryKey=year_id&listMultilingualFields=year_label&labelKey=year_label
 * http://localhost:8088/appRAD/model/create?module=nextSteps&ModelName=Tag&tableName=nextsteps_tag&primaryKey=tag_id&labelKey=tag_label
 * http://localhost:8088/appRAD/model/create?module=nextSteps&ModelName=ContactTag&tableName=nextsteps_contact_tag&primaryKey=contacttag_id&labelKey=tag_id
 * 
 */

/*
 * Unfortunately, Android does not allow access to global variables from within CommonJS modules,
 * (see http://developer.appcelerator.com/question/130229/android-cannot-find-my-global-variable-within-a-commonjs-module)
 * so the AppDev and jQuery modules must be required individually by each module that needs to use them
 */

// Initialize the AppDev framework
var AD = require('AppDev');
AD.init({
    models: ['Viewer', 'Contact', 'Group', 'Year', 'Tag', 'ContactTag'],
    windows: ['AppContactsWindow', 'AppGroupsWindow', 'AppStatsWindow', 'AppInfoWindow']
});
