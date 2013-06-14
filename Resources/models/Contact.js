////
//// Contact
////
//// This model is the interface to the nextsteps_contact table.


(function () {
    // Pull AppDev from the global scope on NodeJS and browser and load the AppDev CommonJS module on Titanium
    var AD = AD || (global && global.AD) || require('AppDev');
    
    // On Titanium and NodeJS, the full model definition is needed
    var extendedDefinition = typeof Titanium !== 'undefined' || typeof process !== 'undefined';
    
    var attr = {
        // Shared model attributes
        _adModule:'nextSteps',
        _adModel:'Contact',
        id:'contact_guid',
        autoIncrementKey:'contact_id',
        labelKey:'contact_firstName',
        _isMultilingual:false,
        //connectionType:'server', // optional field
        cache:true,
        
        // name:field_name map of all step fields
        steps: {
            'preEv': 'contact_preEv',
            'conversation': 'contact_conversation',
            'Gpresentation': 'contact_Gpresentation',
            'decision': 'contact_decision',
            'finishedFU': 'contact_finishedFU',
            'HSpresentation': 'contact_HSpresentation',
            'engaged': 'contact_engaged',
            'ministering': 'contact_ministering',
            'multiplying': 'contact_multiplying'
        },
        
        attributes: {
            contact_id: 'integer',
            viewer_id: 'integer',
            contact_recordId: 'integer',
            year_id: 'integer',
            contact_preEv: 'date',
            contact_conversation: 'date',
            contact_Gpresentation: 'date',
            contact_decision: 'date',
            contact_finishedFU: 'date',
            contact_HSpresentation: 'date',
            contact_engaged: 'date',
            contact_ministering: 'date',
            contact_multiplying: 'date'
        },
        // Calculate the stats information between startDate and endDate inclusive
        // The parameters can be set to null to remove that bound
        // Return an object whose keys represent fieldnames and values represents the number of contacts who have completed the step
        //{
        //    contact_preEv: 24,
        //    contact_conversation: 17,
        //    contact_Gpresentation: 15,
        //    contact_decision: 7,
        //    contact_finishedFU: 9,
        //    contact_HSpresentation: 10,
        //    contact_engaged: 5,
        //    contact_ministering: 9,
        //    contact_multiplying: 8
        //}
        getStats: function(startDate, endDate) {
            var steps = this.steps;
            
            // Initialize the stats object
            var stats = {};
            AD.jQuery.each(steps, function(stepName, stepFieldName) {
                stats[stepFieldName] = 0;
            });
            
            // For each contact, determine whether any steps have been taken since the last stats report
            this.cache.getArray().forEach(function(contact) {
                AD.jQuery.each(steps, function(stepName, stepFieldName) {
                    var stepCompletionDate = contact[stepFieldName];
                    // The step must have been taken and between the start and end dates, if they were specified
                    if (stepCompletionDate && (!startDate || stepCompletionDate >= startDate) && (!endDate || stepCompletionDate <= endDate)) {
                        ++stats[stepFieldName];
                    }
                });
            });
            
            return stats;
        }
    };
    
    if (extendedDefinition) {
        // Extended model attributes
        AD.jQuery.extend(attr, {
            type:'single',  // 'single' | 'multilingual'
            dbTable:'nextsteps_contact',
            modelFields: {
                  contact_id:"int(11) unsigned",
                  contact_guid:"varchar(60)",
                  viewer_id:"int(11) unsigned",
                  device_id:"text",
                  contact_recordId:"int(11) unsigned",
                  contact_firstName:"text",
                  contact_lastName:"text",
                  contact_nickname:"text",
                  contact_campus:"text",
                  year_id:"int(11)",
                  contact_phone:"text",
                  contact_phoneId:"text",
                  contact_email:"text",
                  contact_emailId:"text",
                  contact_notes:"text",
                  contact_preEv:"date",
                  contact_conversation:"date",
                  contact_Gpresentation:"date",
                  contact_decision:"date",
                  contact_finishedFU:"date",
                  contact_HSpresentation:"date",
                  contact_engaged:"date",
                  contact_ministering:"date",
                  contact_multiplying:"date"

            },
            lookupLabels: {
                year_id: {
                    tableName: 'nextsteps_year_trans',
                    foreignKey: 'year_id',
                    referencedKey: 'year_id',
                    label: 'year_label'
                }
            },
            primaryKey:'contact_guid'
        });
    }
    
    
    var Model = AD.Model.extend("nextSteps.Contact",
    attr,
    {
        // define instance methods here.
        
        // Return the label of this contact
        getLabel: function() {
            return this.contact_firstName+' '+this.contact_lastName+(this.contact_nickName ? ' ('+this.contact_nickName+')' : '');
        },
        
        // Return an array of the Tag models associated with this contact
        getTags: function() {
            return AD.Models.ContactTag.cache.query({
                contact_guid: this.attr('contact_guid')
            });
        },

        // Set the tags associated with this contact
        setTags: function(newTags) {
            var contact_guid = this.attr('contact_guid');
            var oldTags = this.getTags();
            newTags.forEach(function(newTag, index) {
                // newTag can be a Tag instance or a plain object
                var newTagAttrs = AD.jQuery.isFunction(newTag.attrs) ? newTag.attrs() : newTag;
                // Reuse the existing tag if possible, but create a new tag instance if necessary
                var tagInstance = oldTags[index] || new AD.Models.ContactTag({ contact_guid: contact_guid });
                tagInstance.attrs(newTagAttrs);
                tagInstance.save();
            });
            // Delete any remaining tags that were not reused
            oldTags.slice(newTags.length).forEach(function(oldTag) {
                oldTag.destroy();
            });
        },

        // Return the last completed step of this contact
        getLastStep: function() {
            var self = this;
            var lastStepName = null; 
            var lastStepCompletionDate = null;
            AD.jQuery.each(this.constructor.steps, function(stepName, fieldName) {
                var stepCompletionDate = self.attr(fieldName);
                if (stepCompletionDate !== null && (lastStepCompletionDate === null || stepCompletionDate >= lastStepCompletionDate)) {
                    lastStepName = stepName;
                    lastStepCompletionDate = stepCompletionDate;
                }
            });
            return lastStepName ? {
                stepName: lastStepName,
                fieldName: this.constructor.steps[lastStepName],
                completionDate: lastStepCompletionDate
            } : null;
        },
        
        // Return a boolean indicating whether the contact matches the specified filter
        matchesFilter: function(filter) {
            var matches = true;
            AD.jQuery.each(filter, this.proxy(function(key, value) {
                var contactValue = this.attr(key);
                var matchesProperty = contactValue === value;
                if (typeof value === 'boolean' && this.constructor.attributes[key] === 'date') {
                    // Special case when value is a boolean and contactValue is a date
                    // 'true' in value refers to a valid date, and 'false' refers to null 
                    matchesProperty = value === (contactValue !== null);
                }
                if (!matchesProperty) {
                    // This property does not match the filter, so stop the comparison
                    matches = false;
                    return false;
                }
            }));
            return matches;
        }
    });
    
    if (module && module.exports) {
        // This is a CommonJS module, so return the model
        module.exports = Model;
    }
})();
