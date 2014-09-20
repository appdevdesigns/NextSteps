var AD = require('AppDev');
var $ = require('jquery');

module.exports = {
    // Calculate the end of the closest school year
    schoolYearEnd: function() {
        var schoolYearEnd = AD.PropertyStore.get('schoolYearEnd');
        var today = $.today();
        var schoolYearEndDate = new Date(today.getFullYear(), schoolYearEnd.month, schoolYearEnd.date);
        if (today > schoolYearEndDate) {
            // The school year ends next year
            schoolYearEndDate.setFullYear(today.getFullYear() + 1);
        }
        return schoolYearEndDate;
    }
};
