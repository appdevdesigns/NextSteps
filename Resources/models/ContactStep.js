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
        id:'contactstep_uuid',
        hasUuid:true,
        labelKey:'step_label',
        _isMultilingual:false,
        //connectionType:'server', // optional field
        cache:true,

        attributes: {
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
                  contactstep_uuid:"varchar(36)",
                  contact_uuid:"varchar(36)",
                  step_uuid:"varchar(36)",
                  step_date:"date"

            },
            lookupLabels: {
                step_label: {
                    tableName: 'nextsteps_step_trans',
                    foreignKey: 'step_uuid',
                    referencedKey: 'step_uuid',
                    label: 'step_label'
                }
            },
            primaryKey:'contactstep_uuid'
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
