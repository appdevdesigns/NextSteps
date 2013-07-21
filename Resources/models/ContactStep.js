////
//// ContactStep
////
//// This model is the interface to the nextsteps_contactstep_step table.


(function () {
    // Pull AppDev from the global scope on NodeJS and browser and load the AppDev CommonJS module on Titanium
    var AD = AD || (global && global.AD) || require('AppDev');

    // On Titanium and NodeJS, the full model definition is needed
    var extendedDefinition = typeof Titanium !== 'undefined' || typeof process !== 'undefined';

    var attr = {
        // Shared model attributes
        _adModule:'nextStep',
        _adModel:'ContactStep',
        id:'contactstep_guid',
        autoIncrementKey:'contactstep_id',
        labelKey:'step_label',
        _isMultilingual:false,
        //connectionType:'server', // optional field
        cache:true,

        attributes: {
            contactstep_id: 'integer',
            viewer_id: 'integer',
            step_date: 'date'
        },
    };

    if (extendedDefinition) {
        // Extended model attributes
        AD.jQuery.extend(attr, {
            type:'single',  // 'single' | 'multilingual'
            dbTable:'nextsteps_contact_step',
            modelFields: {
                  contactstep_id:"int(11) unsigned",
                  contactstep_guid:"varchar(60)",
                  viewer_id:"int(11) unsigned",
                  device_id:"text",
                  contact_guid:"varchar(60)",
                  step_guid:"varchar(60)",
                  step_date:"date"

            },
            lookupLabels: {
                step_label: {
                    tableName: 'nextsteps_step',
                    foreignKey: 'step_guid',
                    referencedKey: 'step_guid',
                    label: 'step_label',
                    hasLanguageCode: false
                }
            },
            primaryKey:'contactstep_guid'
        });
    }


    var Model = AD.Model.extend("nextStep.ContactStep",
    attr,
    {
        // define instance methods here.
    });

    if (module && module.exports) {
        // This is a CommonJS module, so return the model
        module.exports = Model;
    }
})();
