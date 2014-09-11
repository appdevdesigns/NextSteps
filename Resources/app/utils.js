var $ = require('jquery');

module.exports = {
    // Calculate the end of the closest school year
    schoolYearEnd: function() {
        var today = $.today();
        var schoolYearEnd = new Date(today.getFullYear(), 5, 1); // June 1st of the current year
        if (today > schoolYearEnd) {
            // The school year ends next year
            schoolYearEnd.setFullYear(today.getFullYear() + 1);
        }
        return schoolYearEnd;
    }
};
