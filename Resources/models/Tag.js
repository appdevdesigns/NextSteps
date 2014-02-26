////
//// Tag
////
//// This model is the interface to the nextsteps_tag_data table.


(function () {
    // Pull AppDev from the global scope on NodeJS and browser and load the AppDev CommonJS module on Titanium
    var AD = AD || (global && global.AD) || require('AppDev');

    // On Titanium and NodeJS, the full model definition is needed
    var extendedDefinition = typeof Titanium !== 'undefined' || typeof process !== 'undefined';

    var attr = {
        // Shared model attributes
        _adModule:'nextSteps',
        _adModel:'Tag',
        id:'tag_uuid',
        hasUuid:true,
        labelKey:'tag_label',
        _isMultilingual:true,
        //connectionType:'server', // optional field
        cache:true,

        attributes: {
            trans_id: 'integer',
            user_id: 'integer'
        }
    };

    if (extendedDefinition) {
        // Extended model attributes
        AD.jQuery.extend(attr, {
            type:'multilingual',  // 'single' | 'multilingual'
            tables:{
                data:'nextsteps_tag_data',
                trans:'nextsteps_tag_trans'
            },
            fields: {
                data: {
                    tag_uuid:"varchar(36)",
                    user_id:"int(11) unsigned"
                },
                trans: {
                    trans_uuid:"varchar(36)",
                    user_id:"int(11) unsigned",
                    tag_label:"varchar(40)"
                }
            },
            primaryKey:'tag_uuid',
            multilingualFields: ['tag_label']
        });
    }


    var Model = AD.Model.extend("nextSteps.Tag",
    attr,
    {
        // define instance methods here.
    });

    if (module && module.exports) {
        // This is a CommonJS module, so return the model
        module.exports = Model;
    }
})();
