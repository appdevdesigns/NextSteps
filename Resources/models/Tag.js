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
        id:'tag_guid',
        autoIncrementKey:'tag_id',
        labelKey:'tag_label',
        _isMultilingual:true,
        //connectionType:'server', // optional field
        cache:true,

        attributes: {
            tag_id: 'integer',
            trans_id: 'integer',
            viewer_id: 'integer'
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
                    tag_id:"int(11) unsigned",
                    tag_guid:"varchar(60)",
                    viewer_id:"int(11) unsigned",
                    device_id:"text",
                },
                trans: {
                    trans_id:"int(11) unsigned",
                    trans_guid:"varchar(60)",
                    viewer_id:"int(11) unsigned",
                    device_id:"text",
                    tag_label:"varchar(40)"
                }
            },
            primaryKey:'tag_guid',
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
