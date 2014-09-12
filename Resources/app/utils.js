var AD = require('AppDev');
var $ = require('jquery');

module.exports = {
    // Calculate the end of the closest school year
    schoolYearEnd: function() {
        var schoolYearEnd = AD.PropertyStore.get('schoolYearEnd');
        var today = $.today();
        var schoolYearEnd = new Date(today.getFullYear(), schoolYearEnd.month, schoolYearEnd.date);
        if (today > schoolYearEnd) {
            // The school year ends next year
            schoolYearEnd.setFullYear(today.getFullYear() + 1);
        }
        return schoolYearEnd;
    }
};
