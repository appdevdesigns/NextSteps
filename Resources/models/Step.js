////
//// Step
////
//// This model is the interface to the nextsteps_step_data table.


(function () {
    // Pull AppDev from the global scope on NodeJS and browser and load the AppDev CommonJS module on Titanium
    var AD = AD || (global && global.AD) || require('AppDev');

    // On Titanium and NodeJS, the full model definition is needed
    var extendedDefinition = typeof Titanium !== 'undefined' || typeof process !== 'undefined';

    var attr = {
        // Shared model attributes
        _adModule:'nextSteps',
        _adModel:'Step',
        id:'step_uuid',
        hasUuid:true,
        labelKey:'step_label',
        _isMultilingual:true,
        //connectionType:'server', // optional field
        cache:true,

        attributes: {
            trans_id: 'integer',
            viewer_id: 'integer'
        },
        defaults: {
            campus_uuid: null
        }
    };

    if (extendedDefinition) {
        // Extended model attributes
        AD.jQuery.extend(attr, {
            type:'multilingual',  // 'single' | 'multilingual'
            tables:{
                data:'nextsteps_step_data',
                trans:'nextsteps_step_trans'
            },
            fields: {
                data: {
                    step_uuid:"varchar(36)",
                    campus_uuid:"varchar(36)"
                },
                trans: {
                    trans_uuid:"varchar(36)",
                    step_label:"varchar(40)"
                }
            },
            primaryKey:'step_uuid',
            multilingualFields: ['step_label']
        });
    }


    var Model = AD.Model.extend("nextSteps.Step",
    attr,
    {
        // define instance methods here.
    });

    if (module && module.exports) {
        // This is a CommonJS module, so return the model
        module.exports = Model;
    }
})();
