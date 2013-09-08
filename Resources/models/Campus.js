////
//// Campus
////
//// This model is the interface to the nextsteps_campus_data table.


(function () {
    // Pull AppDev from the global scope on NodeJS and browser and load the AppDev CommonJS module on Titanium
    var AD = AD || (global && global.AD) || require('AppDev');

    // On Titanium and NodeJS, the full model definition is needed
    var extendedDefinition = typeof Titanium !== 'undefined' || typeof process !== 'undefined';

    var attr = {
        // Shared model attributes
        _adModule:'nextSteps',
        _adModel:'Campus',
        id:'campus_guid',
        autoIncrementKey:'campus_id',
        labelKey:'campus_label',
        _isMultilingual:true,
        //connectionType:'server', // optional field
        cache:true,

        attributes: {
            campus_id: 'integer',
            trans_id: 'integer',
            viewer_id: 'integer'
        }
    };

    if (extendedDefinition) {
        // Extended model attributes
        AD.jQuery.extend(attr, {
            type:'multilingual',  // 'single' | 'multilingual'
            tables:{
                data:'nextsteps_campus_data',
                trans:'nextsteps_campus_trans'
            },
            fields: {
                data: {
                    campus_id:"int(11) unsigned",
                    campus_guid:"varchar(60)",
                    viewer_id:"int(11) unsigned",
                    device_id:"text",
                },
                trans: {
                    trans_id:"int(11) unsigned",
                    campus_label:"varchar(40)"
                }
            },
            primaryKey:'campus_guid',
            multilingualFields: ['campus_label']
        });
    }


    var Model = AD.Model.extend("nextSteps.Campus",
    attr,
    {
        // define instance methods here.
    });

    if (module && module.exports) {
        // This is a CommonJS module, so return the model
        module.exports = Model;
    }
})();
