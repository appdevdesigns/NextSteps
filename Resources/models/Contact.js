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
        id:'contact_uuid',
        hasUuid:true,
        labelKey:'contact_firstName',
        _isMultilingual:false,
        //connectionType:'server', // optional field
        cache:true,
        
        attributes: {
            contact_recordId: 'integer',
            year_id: 'integer'
        },

        // An array of the conditions supported by matchesFilter
        filterConditions: ['OR', 'AND'],
        // This object defines custom filter fields
        filterFields: {
            tags: {
                value: function() {
                    // Return an array of tag ids
                    return this.getTags().map(function(tag) { return tag.attr('tag_uuid'); });
                },
                matches: function(contactTags, filterTags) {
                    // Calculate whether the tags sets match, using the given condition
                    var condition = filterTags.condition;
                    var matchesProperty = condition === 'AND';
                    filterTags.ids.forEach(function(tag_uuid) {
                        var matchesElement = contactTags.indexOf(tag_uuid) !== -1;
                        if (condition === 'OR') {
                            // Starts false and remains false until one tag matches
                            matchesProperty = matchesProperty || matchesElement;
                        }
                        else if (condition === 'AND') {
                            // Starts true and remains true until one tag does not match
                            matchesProperty = matchesProperty && matchesElement;
                        }
                    });
                    return matchesProperty;
                }
            },
            steps: {
                value: function() {
                    // Return a dictionary of step completion dates
                    var completionDates = {};
                    this.getSteps().forEach(function(step) {
                        completionDates[step.attr('step_uuid')] = step.attr('step_date');
                    });
                    return completionDates;
                },
                matches: function(completionDates, steps) {
                    // Calculate whether the steps match
                    var matchesProperty = true;
                    AD.jQuery.each(steps, function(step_uuid, value) {
                        var completedStep = completionDates[step_uuid] ? true : false;
                        var matchesElement = completedStep === value;
                        matchesProperty = matchesProperty && matchesElement;
                    });
                    return matchesProperty;
                }
            }
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
            var steps = AD.Models.Step.cache.getArray();
            
            // Initialize the stats object
            var stats = {};
            steps.forEach(function(step) {
                stats[step.getId()] = 0;
            });
            
            // For each contact, determine whether any steps have been taken since the last stats report
            this.cache.getArray().forEach(function(contact) {
                steps.forEach(function(step) {
                    var stepId = step.getId();
                    var stepCompletionDate = contact.getStep(stepId).attr('step_date');
                    // The step must have been taken and between the start and end dates, if they were specified
                    if (stepCompletionDate && (!startDate || stepCompletionDate >= startDate) && (!endDate || stepCompletionDate <= endDate)) {
                        ++stats[stepId];
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
                  contact_uuid:"varchar(36)",
                  contact_recordId:"int(11) unsigned",
                  contact_firstName:"text",
                  contact_lastName:"text",
                  contact_nickname:"text",
                  campus_uuid:"varchar(36)",
                  year_id:"int(11)",
                  contact_phone:"text",
                  contact_phoneId:"text",
                  contact_email:"text",
                  contact_emailId:"text",
                  contact_notes:"text"

            },
            lookupLabels: {
                campus_uuid: {
                    tableName: 'nextsteps_campus_trans',
                    foreignKey: 'campus_uuid',
                    referencedKey: 'campus_uuid',
                    label: 'campus_label'
                },
                year_id: {
                    tableName: 'nextsteps_year_trans',
                    foreignKey: 'year_id',
                    referencedKey: 'year_id',
                    label: 'year_label'
                }
            },
            primaryKey:'contact_uuid'
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
                contact_uuid: this.getId()
            });
        },

        // Set the tags associated with this contact
        setTags: function(newTags) {
            var contact_uuid = this.getId();
            var oldTags = this.getTags();
            newTags.forEach(function(newTag, index) {
                // newTag can be a Tag instance or a plain object
                var newTagAttrs = AD.jQuery.isFunction(newTag.attrs) ? newTag.attrs() : newTag;
                // Reuse the existing tag if possible, but create a new tag instance if necessary
                var tagInstance = oldTags[index] || new AD.Models.ContactTag({ contact_uuid: contact_uuid });
                tagInstance.attrs(newTagAttrs);
                tagInstance.save();
            });
            // Delete any remaining tags that were not reused
            oldTags.slice(newTags.length).forEach(function(oldTag) {
                oldTag.destroy();
            });
        },

        // Set the personal steps associated with this contact
        setPersonalSteps: function(newSteps) {
            // Models in oldSteps that are not in newSteps will be destroyed, models in newSteps
            // that are not in oldSteps will be created, and models in both lists will be ignored.
            var oldContactSteps = this.getPersonalSteps();
            var oldStepIds = oldContactSteps.map(function(step) {
                return step.attr('step_uuid');
            });
            var newStepIds = $.Model.getIds(newSteps);
            var toDestroyContactSteps = oldContactSteps.filter(function(oldContactStep) {
                return newStepIds.indexOf(oldContactStep.attr('step_uuid')) === -1;
            });
            var toCreateSteps = newSteps.filter(function(newStep) {
                return oldStepIds.indexOf(newStep.getId()) === -1;
            });
            
            toDestroyContactSteps.forEach(function(contactStep) {
                contactStep.destroy();
            });
            var contact_uuid = this.getId();
            toCreateSteps.forEach(function(step) {
                var newContactStep = new AD.Models.ContactStep({ 
                    contact_uuid: contact_uuid,
                    step_uuid: step.getId(),
                    step_date: null,
                    step_label: step.getLabel()
                });
                newContactStep.save();
            });
        },
        
        // Return an array of Personal Step models associated with this contact
        getPersonalSteps: function() {
            return AD.Models.ContactStep.cache.query({
                contact_uuid: this.getId(),
                campus_uuid: null
            });
        },

        // Return an array of the Step models associated with this contact
        // Completed steps are returned, regardless of their associated campus
        getSteps: function() {
            var contact_campus_uuid = this.attr('campus_uuid');
            return AD.Models.ContactStep.cache.query({
                contact_uuid: this.getId()
            }).filter(function(contactStep) {
                var step = AD.Models.Step.cache.getById(contactStep.attr('step_uuid'));
                var step_campus_uuid = step.attr('campus_uuid');
                return step_campus_uuid === null || (contact_campus_uuid && step_campus_uuid === contact_campus_uuid) || contactStep.attr('step_date');
            });
        },

        // Return a Step model with the specified step_uuid associated with this contact
        getStep: function(step_uuid) {
            var contact_uuid = this.getId();
            var steps = AD.Models.ContactStep.cache.query({
                contact_uuid: contact_uuid,
                step_uuid: step_uuid
            });
            return steps.length > 0 ? steps[0] : new AD.Models.ContactStep({
                contact_uuid: contact_uuid,
                step_uuid: step_uuid,
                step_label: AD.Models.Step.cache.getById(step_uuid).getLabel(),
                step_date: null
            });
        },

        // Return the last completed step of this contact
        getLastStep: function() {
            var self = this;
            var lastStep = null;
            var lastStepCompletionDate = null;
            this.getSteps().forEach(function(step) {
                var stepCompletionDate = step.attr('step_date');
                if (stepCompletionDate !== null && (lastStepCompletionDate === null || stepCompletionDate >= lastStepCompletionDate)) {
                    lastStep = step;
                    lastStepCompletionDate = stepCompletionDate;
                }
            });
            return lastStep;
        },
        
        // Return a boolean indicating whether the contact matches the specified filter
        matchesFilter: function(filter) {
            var matches = true;
            AD.jQuery.each(filter, this.proxy(function(key, value) {
                var filterField = this.constructor.filterFields[key];
                var contactValue = filterField ? filterField.value.call(this) : this.attr(key);
                var matchesProperty;
                if (filterField) {
                    // The filter defines whether the two values match
                    matchesProperty = filterField.matches.call(this, contactValue, value);
                }
                else {
                    // General case where the two values are directly compared to determine equality
                    matchesProperty = contactValue === value;
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
